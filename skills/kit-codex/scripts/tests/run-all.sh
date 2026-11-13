#!/usr/bin/env bash
# Run all codex script tests. Each test file is self-contained and sandboxed
# (throwaway temp git repos/dirs, fake `gh`/`codex` executables) -- none of
# them touch this repository's real working tree.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

status=0
for test_file in "$DIR"/test-*.sh; do
  echo "=== $(basename "$test_file") ==="
  bash "$test_file" || status=1
  echo
done

exit "$status"
