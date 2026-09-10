#!/bin/sh
set -eu

# Renders the release workflow YAML files into OUT_DIR, for upload as a
# build artifact. Runs with no credentials of any kind — this step only
# ever produces plain data for a separate, privileged job to act on.
#
# Required environment: OUT_DIR (directory to write the rendered files
# into, preserving their .github/workflows/... relative paths).

OUT_DIR=${OUT_DIR:?OUT_DIR must be set}

expected_files="
.github/workflows/release-pr.yml
.github/workflows/test-release-pr.yml
.github/workflows/release.yml
.github/workflows/check.yml
.github/workflows/gel-check.yml
"

render_dir=$(mktemp -d)
trap 'rm -rf "${render_dir}"' EXIT

make release-workflows RENDER_DIR="${render_dir}"

actual_files=$(cd "${render_dir}" && find . -type f | sed 's|^\./||' | sort)
# shellcheck disable=SC2086 # word-splitting ${expected_files} into one arg per line is intentional.
expected_sorted=$(printf '%s\n' ${expected_files} | sort)
if [ "${actual_files}" != "${expected_sorted}" ]; then
  echo "render-workflows: rendered file set does not match the expected set" >&2
  echo "expected:" >&2
  echo "${expected_sorted}" >&2
  echo "actual:" >&2
  echo "${actual_files}" >&2
  exit 1
fi

manifest="${OUT_DIR}/MANIFEST.txt"
mkdir -p "${OUT_DIR}"
: > "${manifest}"
for f in ${expected_files}; do
  mkdir -p "${OUT_DIR}/$(dirname "${f}")"
  cp "${render_dir}/${f}" "${OUT_DIR}/${f}"
  echo "${f}" >> "${manifest}"
done
