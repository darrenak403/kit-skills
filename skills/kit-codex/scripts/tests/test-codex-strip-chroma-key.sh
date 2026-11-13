#!/usr/bin/env bash
# Minimal bash test harness for codex-strip-chroma-key.sh (no bats dependency).
# Runs against throwaway temp dirs/CODEX_HOME -- never the real ~/.codex.
#
# Usage: bash tests/test-codex-strip-chroma-key.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/../codex-strip-chroma-key.sh"

PASS=0
FAIL=0

report() {
  local status="$1" name="$2"
  if [[ "$status" == "0" ]]; then echo "ok - $name"; PASS=$((PASS + 1));
  else echo "not ok - $name"; FAIL=$((FAIL + 1)); fi
}

test_requires_two_arguments() {
  local status=0
  bash "$TARGET_SCRIPT" only-one-arg.png >/dev/null 2>&1 || status=$?
  [[ "$status" -eq 2 ]]
}

test_rejects_missing_input_file() {
  local workdir status=0
  workdir="$(mktemp -d)"
  CODEX_HOME="$workdir/fake-codex-home" \
    bash "$TARGET_SCRIPT" "$workdir/does-not-exist.png" "$workdir/out.png" >/dev/null 2>&1 || status=$?
  rm -rf "$workdir"
  [[ "$status" -eq 1 ]]
}

test_rejects_missing_upstream_helper() {
  local workdir status=0
  workdir="$(mktemp -d)"
  echo "fake png" > "$workdir/in.png"
  # CODEX_HOME points at an empty dir -- no .system/imagegen helper present.
  CODEX_HOME="$workdir/empty-codex-home" \
    bash "$TARGET_SCRIPT" "$workdir/in.png" "$workdir/out.png" >/dev/null 2>&1 || status=$?
  rm -rf "$workdir"
  [[ "$status" -eq 1 ]]
}

main() {
  if test_requires_two_arguments; then report 0 "exits 2 when fewer than 2 arguments given"; else report 1 "exits 2 when fewer than 2 arguments given"; fi
  if test_rejects_missing_input_file; then report 0 "exits 1 when input file does not exist"; else report 1 "exits 1 when input file does not exist"; fi
  if test_rejects_missing_upstream_helper; then report 0 "exits 1 when upstream imagegen helper is missing"; else report 1 "exits 1 when upstream imagegen helper is missing"; fi

  echo
  echo "pass: $PASS  fail: $FAIL"
  [[ "$FAIL" -eq 0 ]]
}

main
