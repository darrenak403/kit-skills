# Unified Workflow Steps

All modes share core steps with mode-specific variations.

**Task Tool Fallback:** `manage_plan create operation`/`manage_plan update operation`/`manage_plan read operation`/`manage_plan list operation` are CLI-only — unavailable in VSCode extension. If they error, use `manage_plan capability` for progress tracking. All workflow steps remain functional without Task tools. Full hydrate/sync-back doctrine: `../../_shared/task-hydration.md`.

## Step 0: Intent Detection & Setup

1. Parse input with `intent-detection.md` rules
2. Log detected mode: `✓ Step 0: Mode [X] - [reason]`
3. If mode=code: detect plan path, set active plan
4. Use `manage_plan create operation` to create workflow step tasks (with dependencies if complex)

**Output:** `✓ Step 0: Mode [interactive|auto|fast|parallel|no-test|code] - [detection reason]`

## Step 1: Research (skip if fast/code mode)

**Interactive/Auto:**
- Spawn multiple `researcher` agents in parallel
- Use `/kit:scout ext` or `scout` agent for codebase search
- Keep reports ≤150 lines

**Parallel:**
- Optional: max 2 researchers if complex

**Output:** `✓ Step 1: Research complete - [N] reports gathered`

### [Review Gate 1] Post-Research (skip if auto mode)
- Present research summary to user
- Use `ask_user capability` to ask: "Proceed to planning?" / "Request more research" / "Abort"
- **Auto mode:** Skip this gate

## Step 2: Planning

**Interactive/Auto/No-test:**
- Use `planner` agent with research context
- Create `plan.md` + `phase-XX-*.md` files

**Fast:**
- Use `kit:plan --fast` with scout results only
- Minimal planning, focus on action

**Parallel:**
- Use `kit:plan --parallel` for dependency graph + file ownership matrix

**Code:**
- Skip - plan already exists
- Parse existing plan for phases

**Output:** `✓ Step 2: Plan created - [N] phases`

### [Review Gate 2] Post-Plan (skip if auto mode)
- Present plan overview with phases
- Use `ask_user capability` to ask: "Validate the plan or approve plan to start implementation?" - "Validate" / "Approve" / "Abort" / "Other" ("Request revisions")
  - "Validate": run `kit:plan validate` skill invocation
  - "Approve": continue to implementation
  - "Abort": stop the workflow
  - "Other": revise the plan based on user's feedback
- **Auto mode:** Skip this gate

## Step 3: Implementation

**IMPORTANT:**
1. `manage_plan list operation` first — check for existing tasks (hydrated by planning skill in same session)
2. If tasks exist → pick them up, skip re-creation
3. If no tasks → read plan phases, `manage_plan create operation` for each unchecked `[ ]` item with priority order and metadata (`phase`, `planDir`, `phaseFile`)
4. Tasks can be blocked by other tasks via `addBlockedBy`

### Conformance Checklist (before writing code)

Before implementing each phase, the developer agent MUST:

1. **Read `./docs/code-standards.md`** and confirm naming, file structure, and
   error-handling patterns still match the repo.
2. **Scout adjacent code patterns** in the files being modified and follow the
   same import, logging, and error-wrapping style.
3. **Check for existing helpers** before creating new utilities so the change
   stays DRY.
4. **Verify interface contracts** so new code extends the current surface
   instead of creating a parallel one.
5. **Cross-check the plan checklist** so every file in the phase inventory is
   actually addressed.

After each file is modified:
- **Compile check:** run the relevant project compile/type-check command
- **Pattern verify:** confirm the new code matches adjacent conventions
- **Import check:** confirm no circular dependency or dead import was added

### `--tdd` Flag Behavior

When `--tdd` is active, Step 3 splits into sub-steps per phase:

```
Step 3.T: Write tests for CURRENT behavior (regression safety net)
Step 3.I: Implement changes (refactor, new code)
Step 3.V: Verify all tests from 3.T still pass + compile gates
```

Tests from Step 3.T document the current behavior. If any fail after Step 3.I,
the refactor broke something and must be fixed before the workflow proceeds.

**All modes:**
- Use `manage_plan update operation` to mark tasks as `in_progress` immediately.
- Execute phase tasks sequentially (Step 3.1, 3.2, etc.)
- Use `ui-ux-designer` for frontend
- Use `kit:codex` for image assets
- Run type checking after each file

**Parallel mode:**
- Utilize all tools of Claude Tasks: `manage_plan create operation`, `manage_plan update operation`, `manage_plan read operation` and `manage_plan list operation`
- Launch multiple `fullstack-developer` agents
- When agents pick up a task, use `manage_plan update operation` to assign task to agent and mark tasks as `in_progress` immediately.
- Respect file ownership boundaries
- Wait for parallel group before next

**Output:** `✓ Step 3: Implemented [N] files - [X/Y] tasks complete`

### Step 3.S: Conditional Simplify (live-diff gated)

Recompute signals from the live worktree (no hook state):

```bash
totals=$(git diff --numstat HEAD --ignore-all-space)
loc=$(echo "$totals" | awk '{s+=$1+$2} END {print s+0}')
files=$(echo "$totals" | awk 'NF{c++} END {print c+0}')
maxFile=$(echo "$totals" | awk 'BEGIN{m=0} {if ($1>m) m=$1} END {print m+0}')
modified=$(git diff --name-only HEAD)
```

Read thresholds from `.kit.json` (`simplify.threshold.{locDelta,fileCount,singleFileLoc}`),
defaulting to 400 / 8 / 200. If any threshold is breached, spawn the simplifier
scoped to the modified files:

```
delegate_agent capability(subagent_type="code-simplifier", prompt="Simplify these files while preserving behavior exactly: [file-list]", description="Simplify recent edits")
```

After the subagent returns, log only — never re-run or block:
- `git diff --shortstat HEAD -- [file-list]` changed → "simplifier made scoped edits"
- unchanged → "simplifier ran clean"

**Output:** `✓ Step 3.S: Simplify [ran|skipped] - [scoped changes|clean|under threshold]`

This proactive step shares its `simplify.threshold` config with the `simplify-gate` hook (`hooks/simplify-gate.cjs`), a reactive UserPromptSubmit backstop that warns or blocks ship/commit-verb prompts if the diff is still unsimplified when the session tries to finish. Bypass the hook with `HS_SIMPLIFY_DISABLED=1` or `.kit.json` `simplify.gate.enabled: false` (independent of `hooks.simplify-gate: false`, which disables the hook entirely).

### [Review Gate 3] Post-Implementation (skip if auto mode)
- Present implementation summary (files changed, key changes)
- Use `ask_user capability` to ask: "Proceed to testing?" / "Request implementation changes" / "Abort"
- **Auto mode:** Skip this gate

## Step 4: Testing (skip if no-test mode)

**All modes (except no-test):**
- Write tests: happy path, edge cases, errors
- **MUST** spawn `tester` subagent: `delegate_agent capability(subagent_type="tester", prompt="Run test suite", description="Run tests")`
- If failures: **MUST** spawn `debugger` subagent → fix → repeat
- **Forbidden:** fake mocks, commented tests, changed assertions, skipping subagent delegation

**Output:** `✓ Step 4: Tests [X/X passed] - tester subagent invoked`

### [Review Gate 4] Post-Testing (skip if auto mode)
- Present test results summary
- Use `ask_user capability` to ask: "Proceed to code review?" / "Request test fixes" / "Abort"
- **Auto mode:** Skip this gate

## Step 5: Code Review

**All modes - MANDATORY subagent:**
- **MUST** spawn `code-reviewer` subagent using the canonical (a)-(e) delegation prompt in `../../_shared/review-cycle.md`
- **DO NOT** review code yourself - delegate to subagent

**Interactive/Parallel/Code/No-test:**
- Interactive/HITL loop (max 3 cycles): see `../../_shared/review-cycle.md`
- Requires user approval

**Auto:**
- Auto-approve if score≥9.5 AND 0 critical
- Auto-fix critical (max 3 cycles)
- Escalate to user after 3 failed cycles

**Fast:**
- Simplified review, no fix loop
- User approves or aborts

**Output:** `✓ Step 5: Review [score]/10 - [Approved|Auto-approved] - code-reviewer subagent invoked`

## Step 6: Finalize

**All modes - MANDATORY subagents (NON-NEGOTIABLE):**
1. **MUST** activate `the engineer project-management skill` skill (MANDATORY) — run full sync-back for [plan-path]: reconcile all completed Claude Tasks with all phase files, backfill stale completed checkboxes across every phase, then update plan.md frontmatter/table progress. Do NOT only mark current phase.
2. **MUST** spawn in parallel:
   - `delegate_agent capability(subagent_type="docs-manager", prompt="Update docs for changes.", description="Update docs")`
3. Project-management sync-back MUST include:

### Status Sync (Finalize)

Edit plan and phase files directly for deterministic status updates:

- Mark completed phases: set the phase file's frontmatter `status: completed`; update its row in `plan.md`.
- Mark in-progress phases: set the phase file's frontmatter `status: in-progress`; update its row in `plan.md`.
- Revert if needed: set the phase file's frontmatter `status: pending`; update its row in `plan.md`.

When editing `plan.md` directly, only change the Status column cell, preserve table structure.
   - Sweep all `phase-XX-*.md` files in the plan directory.
   - Mark every completed item `[ ] → [x]` based on completed tasks (including earlier phases finished before current phase).
   - Update `plan.md` status/progress (`pending`/`in-progress`/`completed`) from actual checkbox state.
   - Return unresolved mappings if any completed task cannot be matched to a phase file.
4. Use `manage_plan update operation` to mark Claude Tasks complete after sync-back confirmation.
5. Onboarding check (API keys, env vars)
6. **MUST** spawn git subagent: `delegate_agent capability(subagent_type="git-manager", prompt="Stage and commit changes", description="Commit")`

**CRITICAL:** Step 6 is INCOMPLETE without activating `the engineer project-management skill` skill AND spawning `docs-manager` + `git-manager` subagents. DO NOT skip.

**Auto mode:** Continue to next phase automatically, start from **Step 3**.
**Others:** Ask user before next phase

**Output:** `✓ Step 6: Finalized - 3 subagents invoked - Full-plan sync-back completed - Committed`

## Mode-Specific Flow Summary

Legend: `[R]` = Review Gate (human approval required)

```
interactive: 0 → 1 → [R] → 2 → [R] → 3 → [R] → 4 → [R] → 5(user) → 6
auto:        0 → 1 → 2 → 3 → 4 → 5(auto) → 6 → next phase (NO stops)
fast:        0 → skip → 2(fast) → [R] → 3 → [R] → 4 → [R] → 5(simple) → 6
parallel:    0 → 1? → [R] → 2(parallel) → [R] → 3(multi-agent) → [R] → 4 → [R] → 5(user) → 6
no-test:     0 → 1 → [R] → 2 → [R] → 3 → [R] → skip → 5(user) → 6
code:        0 → skip → skip → 3 → [R] → 4 → [R] → 5(user) → 6
```

**Key difference:** `auto` mode is the ONLY mode that skips all review gates.

## Critical Rules

- Never skip steps without mode justification
- **MANDATORY DELEGATION:** Steps 4, 5, 6 MUST delegate via delegate_agent capability / skill activation. DO NOT implement directly.
  - Step 4: `tester` (and `debugger` if failures)
  - Step 5: `code-reviewer`
  - Step 6: `the engineer project-management skill` skill, `docs-manager`, `git-manager`
- Use `manage_plan create operation` to create Claude Tasks for each unchecked item with priority order and dependencies (or `manage_plan capability` if Task tools unavailable).
- Use `manage_plan update operation` to mark Claude Tasks `in_progress` when picking up a task (skip if Task tools unavailable).
- Use `manage_plan update operation` to mark Claude Tasks `complete` immediately after finalizing the task (skip if Task tools unavailable).
- All step outputs follow format: `✓ Step [N]: [status] - [metrics]`
- **VALIDATION:** If delegate_agent calls = 0 at end of workflow, the workflow is INCOMPLETE.
