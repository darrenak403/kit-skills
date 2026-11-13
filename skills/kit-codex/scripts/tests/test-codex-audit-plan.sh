#!/usr/bin/env bash
# Minimal bash test harness for codex-audit-plan.sh (no bats dependency).
# Runs against throwaway temp files/dirs with a fake `codex` executable on
# PATH -- never touches this repository's real plans.
#
# Usage: bash tests/test-codex-audit-plan.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/../codex-audit-plan.sh"

PASS=0
FAIL=0

report() {
  local status="$1" name="$2"
  if [[ "$status" == "0" ]]; then echo "ok - $name"; PASS=$((PASS + 1));
  else echo "not ok - $name"; FAIL=$((FAIL + 1)); fi
}

setup_fake_codex() {
  local bindir
  bindir="$(mktemp -d)"
  cat > "$bindir/codex" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == "exec" ]]; then
  out=""
  prev=""
  for arg in "$@"; do
    if [[ "$prev" == "-o" ]]; then out="$arg"; fi
    prev="$arg"
  done
  [[ -n "$out" ]] && echo "## Critical
- [test] fake finding" > "$out"
  exit 0
fi
echo "unexpected codex invocation: $*" >&2
exit 1
EOF
  chmod +x "$bindir/codex"
  echo "$bindir"
}

test_requires_plan_argument() {
  local status=0
  bash "$TARGET_SCRIPT" >/dev/null 2>&1 || status=$?
  [[ "$status" -eq 2 ]]
}

test_rejects_missing_plan_path() {
  local status=0
  bash "$TARGET_SCRIPT" /nonexistent/plan-path-xyz.md >/dev/null 2>&1 || status=$?
  [[ "$status" -eq 1 ]]
}

test_audits_existing_plan_file() {
  local plan out bindir status=0
  plan="$(mktemp -d)/plan.md"
  mkdir -p "$(dirname "$plan")"
  echo "# Test Plan" > "$plan"
  out="$(dirname "$plan")/audit-out.md"
  bindir="$(setup_fake_codex)"

  PATH="$bindir:$PATH" bash "$TARGET_SCRIPT" "$plan" "$out" >/dev/null 2>&1 || status=$?

  local ok=1
  [[ "$status" -eq 0 && -f "$out" ]] && ok=0
  rm -rf "$(dirname "$plan")" "$bindir"
  [[ "$ok" -eq 0 ]]
}

main() {
  if test_requires_plan_argument; then report 0 "exits 2 with usage error when no plan path given"; else report 1 "exits 2 with usage error when no plan path given"; fi
  if test_rejects_missing_plan_path; then report 0 "exits 1 when plan path does not exist"; else report 1 "exits 1 when plan path does not exist"; fi
  if test_audits_existing_plan_file; then report 0 "writes audit output for an existing plan file"; else report 1 "writes audit output for an existing plan file"; fi

  echo
  echo "pass: $PASS  fail: $FAIL"
  [[ "$FAIL" -eq 0 ]]
}

main
