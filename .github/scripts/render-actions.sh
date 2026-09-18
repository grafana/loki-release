#!/bin/sh
set -eu

# Rebuilds the ncc-bundled actions/*/dist output and copies whatever
# actually changed into OUT_DIR, alongside a MANIFEST.txt listing those
# paths, for upload as a build artifact. Runs with no credentials of any
# kind — this step only ever produces plain data for a separate,
# privileged job to act on.
#
# Each MANIFEST.txt line is either a plain path (add/update — the file is
# present at that path under OUT_DIR) or "DELETE <path>" (the rebuild
# removed a previously-tracked file, so nothing is copied for it).
#
# Required environment: OUT_DIR (directory to write the changed files
# into, preserving their actions/.../dist/... relative paths).

OUT_DIR=${OUT_DIR:?OUT_DIR must be set}

yarn install --immutable
yarn run actions

status_file=$(mktemp)
trap 'rm -f "${status_file}"' EXIT
git status --porcelain -- actions/ > "${status_file}"

mkdir -p "${OUT_DIR}"
manifest="${OUT_DIR}/MANIFEST.txt"
: > "${manifest}"

while IFS= read -r line; do
  [ -n "${line}" ] || continue
  status=$(printf '%s' "${line}" | cut -c1-2)
  path=$(printf '%s' "${line}" | cut -c4-)
  case "${path}" in
    actions/*/dist/*) ;;
    *)
      echo "render-actions: unexpected path changed outside actions/*/dist/: ${path}" >&2
      exit 1
      ;;
  esac
  case "${status}" in
    *D*)
      echo "DELETE ${path}" >> "${manifest}"
      ;;
    *)
      mkdir -p "${OUT_DIR}/$(dirname "${path}")"
      cp "${path}" "${OUT_DIR}/${path}"
      echo "${path}" >> "${manifest}"
      ;;
  esac
done < "${status_file}"
