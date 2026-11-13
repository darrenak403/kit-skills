#!/usr/bin/env bash
# Minimal bash test harness for codex-generate-image.sh (no bats dependency).
# Runs against throwaway temp dirs with a fake `codex` executable on PATH --
# never touches the real ~/.codex directory or CWD.
#
# Usage: bash tests/test-codex-generate-image.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/../codex-generate-image.sh"

PASS=0
FAIL=0

report() {
  local status="$1" name="$2"
  if [[ "$status" == "0" ]]; then echo "ok - $name"; PASS=$((PASS + 1));
  else echo "not ok - $name"; FAIL=$((FAIL + 1)); fi
}

# $1 = "produce" to have the fake codex write a new png into CWD, "silent" to write nothing
setup_fake_codex() {
  local mode="$1" bindir
  bindir="$(mktemp -d)"
  if [[ "$mode" == "produce" ]]; then
    cat > "$bindir/codex" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == "exec" ]]; then
  echo "fake image bytes" > "$PWD/generated-icon.png"
  exit 0
fi
exit 1
EOF
  else
    cat > "$bindir/codex" <<'EOF'
#!/usr/bin/env bash
[[ "$1" == "exec" ]] && exit 0
exit 1
EOF
  fi
  chmod +x "$bindir/codex"
  echo "$bindir"
}

test_requires_prompt_argument() {
  local status=0
  bash "$TARGET_SCRIPT" >/dev/null 2>&1 || status=$?
  [[ "$status" -eq 2 ]]
}

test_warns_and_fails_when_no_image_produced() {
  local workdir bindir status=0
  workdir="$(mktemp -d)"
  bindir="$(setup_fake_codex silent)"

  (
    cd "$workdir"
    HOME="$workdir/fake-home" PATH="$bindir:$PATH" \
      bash "$TARGET_SCRIPT" "a test icon" "$workdir/out"
  ) >/dev/null 2>&1 || status=$?

  rm -rf "$workdir" "$bindir"
  [[ "$status" -eq 1 ]]
}

test_moves_new_image_into_out_dir() {
  local workdir bindir status=0
  workdir="$(mktemp -d)"
  bindir="$(setup_fake_codex produce)"

  (
    cd "$workdir"
    HOME="$workdir/fake-home" PATH="$bindir:$PATH" \
      bash "$TARGET_SCRIPT" "a test icon" "$workdir/out"
  ) >/dev/null 2>&1 || status=$?

  local ok=1
  [[ "$status" -eq 0 && -f "$workdir/out/generated-icon.png" ]] && ok=0
  rm -rf "$workdir" "$bindir"
  [[ "$ok" -eq 0 ]]
}

main() {
  if test_requires_prompt_argument; then report 0 "exits 2 with usage error when no prompt given"; else report 1 "exits 2 with usage error when no prompt given"; fi
  if test_warns_and_fails_when_no_image_produced; then report 0 "exits 1 when codex produces no new image"; else report 1 "exits 1 when codex produces no new image"; fi
  if test_moves_new_image_into_out_dir; then report 0 "moves a codex-produced CWD image into the output directory"; else report 1 "moves a codex-produced CWD image into the output directory"; fi

  echo
  echo "pass: $PASS  fail: $FAIL"
  [[ "$FAIL" -eq 0 ]]
}

main
