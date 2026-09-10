#!/bin/sh
set -eu

# Overlays the files listed in ARTIFACT_DIR/MANIFEST.txt (built by a
# separate, unprivileged render job and downloaded as a plain-data
# artifact) onto HEAD_REF, and pushes the result if anything actually
# changed.
#
# This script itself must only ever run from a checkout of this
# repository's default branch, never from the PR/Renovate branch it's
# updating — that's what keeps the write-scoped token in GH_TOKEN out of
# reach of anything a Renovate PR controls. It never executes anything
# from HEAD_REF: it fetches it into a separate git worktree purely to
# read/overwrite the manifest's listed paths and construct a commit,
# never `make`, `yarn`, `source`, or otherwise runs anything found there.
#
# MANIFEST.txt itself is untrusted: it's produced by a render job that
# checked out and ran code from the Renovate branch, so a tampered branch
# could make that job emit any path it likes regardless of its own
# allowlist logic. The only allowlist that actually matters is ALLOWED_PATHS
# below, since it's supplied as a literal from the (trusted, default-branch)
# calling workflow — every manifest entry must match one of its patterns
# (plain paths or shell globs) or the whole run is rejected.
#
# Each manifest line is either a plain path (the file at that path under
# ARTIFACT_DIR should be added/updated) or "DELETE <path>" (the path
# should be removed if present) — see render-actions.sh.
#
# Required environment: GH_TOKEN (a GitHub App installation token with
# contents:write on this repo), HEAD_REF (the PR's head branch name),
# HEAD_SHA (the commit this push should be based on: the render job's
# commit, or a prior push-rendered-files.sh step's own `sha` output if
# chaining more than one update onto the same branch within a job),
# ARTIFACT_DIR (must contain MANIFEST.txt plus the files it lists),
# ALLOWED_PATHS (newline-separated exact paths or globs manifest entries
# must match), COMMIT_MESSAGE, GITHUB_REPOSITORY (provided by default in
# GitHub Actions). If invoked with an `id:` (so GITHUB_OUTPUT is set),
# outputs `sha`: the commit HEAD_REF ends up at, whether or not this run
# pushed anything.

GH_TOKEN=${GH_TOKEN:?GH_TOKEN must be set}
HEAD_REF=${HEAD_REF:?HEAD_REF must be set}
HEAD_SHA=${HEAD_SHA:?HEAD_SHA must be set}
ARTIFACT_DIR=${ARTIFACT_DIR:?ARTIFACT_DIR must be set}
ALLOWED_PATHS=${ALLOWED_PATHS:?ALLOWED_PATHS must be set}
COMMIT_MESSAGE=${COMMIT_MESSAGE:?COMMIT_MESSAGE must be set}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}

manifest="${ARTIFACT_DIR}/MANIFEST.txt"
if [ ! -f "${manifest}" ]; then
  echo "push-rendered-files: no MANIFEST.txt found in ${ARTIFACT_DIR}" >&2
  exit 1
fi

while IFS= read -r line; do
  [ -n "${line}" ] || continue
  case "${line}" in
    "DELETE "*) f=${line#DELETE } ;;
    *) f=${line} ;;
  esac
  case "${f}" in
    /*|*..*)
      echo "push-rendered-files: unsafe path in manifest: ${f}" >&2
      exit 1
      ;;
    *) ;;
  esac
  allowed=false
  # shellcheck disable=SC2086 # word-splitting ${ALLOWED_PATHS} into one pattern per line is intentional.
  for pattern in ${ALLOWED_PATHS}; do
    # shellcheck disable=SC2254 # unquoted so a pattern like actions/*/dist/* matches as a glob, not literally.
    case "${f}" in
      ${pattern}) allowed=true ;;
      *) ;;
    esac
  done
  if [ "${allowed}" != true ]; then
    echo "push-rendered-files: manifest path not in ALLOWED_PATHS: ${f}" >&2
    exit 1
  fi
done < "${manifest}"

remote_url="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

git fetch --depth=1 "${remote_url}" "${HEAD_REF}"

fetched_sha=$(git rev-parse FETCH_HEAD)
if [ "${fetched_sha}" != "${HEAD_SHA}" ]; then
  echo "push-rendered-files: ${HEAD_REF} has moved since the render (${HEAD_SHA} -> ${fetched_sha}); a newer run will handle it, skipping" >&2
  exit 0
fi

# If GITHUB_OUTPUT is set (i.e. this is a real Actions step with an `id:`),
# report the SHA this run leaves HEAD_REF at, so a later step in the same
# job that's also updating HEAD_REF can pass it back in as *its* HEAD_SHA —
# otherwise it would see the branch as having moved because of our own
# push here and skip, mistaking it for someone else's concurrent change.
report_head_sha() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "sha=$1" >> "${GITHUB_OUTPUT}"
  fi
}

worktree_dir=$(mktemp -d)
trap 'git worktree remove --force "${worktree_dir}" 2>/dev/null || rm -rf "${worktree_dir}"' EXIT
git worktree add --detach "${worktree_dir}" FETCH_HEAD

to_add=""
to_remove=""
while IFS= read -r line; do
  [ -n "${line}" ] || continue
  case "${line}" in
    "DELETE "*)
      f=${line#DELETE }
      if [ -e "${worktree_dir}/${f}" ]; then
        to_remove="${to_remove} ${f}"
      fi
      ;;
    *)
      f=${line}
      mkdir -p "${worktree_dir}/$(dirname "${f}")"
      if ! cmp -s "${ARTIFACT_DIR}/${f}" "${worktree_dir}/${f}"; then
        cp "${ARTIFACT_DIR}/${f}" "${worktree_dir}/${f}"
        to_add="${to_add} ${f}"
      fi
      ;;
  esac
done < "${manifest}"

if [ -z "${to_add}" ] && [ -z "${to_remove}" ]; then
  echo "push-rendered-files: already up to date"
  report_head_sha "${fetched_sha}"
  exit 0
fi

git -C "${worktree_dir}" config user.name "loki-gh-app[bot]"
git -C "${worktree_dir}" config user.email "loki-gh-app[bot]@users.noreply.github.com"
if [ -n "${to_add}" ]; then
  # -f: some allowed paths (e.g. actions/*/dist/*) are individually
  # force-tracked despite a blanket .gitignore rule; git add otherwise
  # refuses to (re-)stage a path it recognises as ignored even when it's
  # already tracked.
  # shellcheck disable=SC2086 # ${to_add} is a space-separated list already validated against ALLOWED_PATHS above.
  git -C "${worktree_dir}" -c core.hooksPath=/dev/null add -f ${to_add}
fi
if [ -n "${to_remove}" ]; then
  # shellcheck disable=SC2086 # ${to_remove} is a space-separated list already validated against ALLOWED_PATHS above.
  git -C "${worktree_dir}" -c core.hooksPath=/dev/null rm -q -f ${to_remove}
fi
git -C "${worktree_dir}" -c core.hooksPath=/dev/null commit --no-verify -m "${COMMIT_MESSAGE}"
git -C "${worktree_dir}" -c core.hooksPath=/dev/null push "${remote_url}" "HEAD:${HEAD_REF}"
report_head_sha "$(git -C "${worktree_dir}" rev-parse HEAD)"
