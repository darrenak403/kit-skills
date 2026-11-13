#!/usr/bin/env bash
# Minimal bash test harness for codex-review-pr.sh (no bats dependency).
#
# Runs the real script against a throwaway temp git repo with fake `gh` and
# `codex` executables on PATH -- never against this repository's live
# working tree. Focuses on the highest-risk logic: does the script always
# restore the prior branch, including when `codex review` itself fails?
#
# Usage: bash tests/test-codex-review-pr.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/../codex-review-pr.sh"

PASS=0
FAIL=0

report() {
  local status="$1" name="$2"
  if [[ "$status" == "0" ]]; then
    echo "ok - $name"
    PASS=$((PASS + 1))
  else
    echo "not ok - $name"
    FAIL=$((FAIL + 1))
  fi
}

# Build a throwaway temp git repo, isolated from the real repository.
setup_repo() {
  local repo
  repo="$(mktemp -d)"
  (
    cd "$repo"
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test"
    echo "initial" > file.txt
    git add file.txt
    git commit -qm "initial commit"
    git checkout -qb feature-branch
    echo "feature work" >> file.txt
    git add file.txt
    git commit -qm "feature work"
  )
  echo "$repo"
}

# Build fake `gh`/`codex` executables on a throwaway PATH dir.
# $1 = codex exit code to simulate (0 = success, nonzero = failure)
setup_fake_bin() {
  local codex_exit="$1"
  local bindir
  bindir="$(mktemp -d)"

  cat > "$bindir/gh" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == "pr" && "$2" == "view" ]]; then
  if [[ "$*" == *baseRefName* ]]; then
    echo "main"
  elif [[ "$*" == *title* ]]; then
    echo "Test PR"
  fi
  exit 0
elif [[ "$1" == "pr" && "$2" == "checkout" ]]; then
  git checkout -qb "pr-$3" 2>/dev/null || git checkout -q "pr-$3"
  exit 0
fi
echo "unexpected gh invocation: $*" >&2
exit 1
EOF
  chmod +x "$bindir/gh"

  cat > "$bindir/codex" <<EOF
#!/usr/bin/env bash
if [[ "\$1" == "review" ]]; then
  # find the -o argument to know where to write output
  out=""
  prev=""
  for arg in "\$@"; do
    if [[ "\$prev" == "-o" ]]; then out="\$arg"; fi
    prev="\$arg"
  done
  if [[ -n "\$out" ]]; then echo "# fake review output" > "\$out"; fi
  exit ${codex_exit}
fi
echo "unexpected codex invocation: \$*" >&2
exit 1
EOF
  chmod +x "$bindir/codex"

  echo "$bindir"
}

test_restores_branch_on_success() {
  local repo bindir
  repo="$(setup_repo)"
  bindir="$(setup_fake_bin 0)"

  (
    cd "$repo"
    PATH="$bindir:$PATH" bash "$TARGET_SCRIPT" 42 "$repo/out.md" >/dev/null 2>&1
  )

  local branch
  branch="$(cd "$repo" && git symbolic-ref --short HEAD)"
  rm -rf "$repo" "$bindir"

  [[ "$branch" == "feature-branch" ]]
}

test_restores_branch_on_codex_failure() {
  local repo bindir status=0
  repo="$(setup_repo)"
  bindir="$(setup_fake_bin 1)"

  (
    cd "$repo"
    PATH="$bindir:$PATH" bash "$TARGET_SCRIPT" 42 "$repo/out.md" >/dev/null 2>&1
  ) || status=$?

  local branch
  branch="$(cd "$repo" && git symbolic-ref --short HEAD)"
  rm -rf "$repo" "$bindir"

  # The script itself must exit non-zero (codex failed, set -e propagates)
  # AND the trap must still have restored the original branch.
  [[ "$status" -ne 0 && "$branch" == "feature-branch" ]]
}

test_requires_pr_argument() {
  local status=0
  bash "$TARGET_SCRIPT" >/dev/null 2>&1 || status=$?
  [[ "$status" -eq 2 ]]
}

main() {
  if test_restores_branch_on_success; then report 0 "restores prior branch after successful review"; else report 1 "restores prior branch after successful review"; fi
  if test_restores_branch_on_codex_failure; then report 0 "restores prior branch even when codex review fails"; else report 1 "restores prior branch even when codex review fails"; fi
  if test_requires_pr_argument; then report 0 "exits 2 with usage error when no PR number given"; else report 1 "exits 2 with usage error when no PR number given"; fi

  echo
  echo "pass: $PASS  fail: $FAIL"
  [[ "$FAIL" -eq 0 ]]
}

main
