# Standard Workflow

Full pipeline for moderate complexity issues. Use the runtime's `manage_plan`
capability for phase tracking. Claude Code exposes this as task-style tools;
Codex Desktop exposes plan update tools instead.

## Plan Setup (Before Starting)

Create phase tracking upfront with dependencies via `manage_plan`. See
`references/task-orchestration.md`.

- Scout codebase
- Diagnose root cause
- Implement fix, blocked by scout + diagnose
- Verify + prevent, blocked by implementation
- Code review, blocked by verification
- Finalize, blocked by review

## Steps

### Step 1: Scout Codebase
Mark the scout phase `in_progress` via `manage_plan` when tracking is available.

**Mandatory skill chain:**
1. Activate `kit:scout` skill OR launch 2-3 parallel `Explore` subagents when delegation is explicitly requested/permitted.
2. Map: affected files, module boundaries, dependencies, related tests, recent git changes.

**Pattern:** If delegation is permitted, launch 2-3 Explore agents in one
assistant turn through `delegate_agent`. In Codex Desktop, expose deferred
multi-agent tools with `tool_search` first, then use
`multi_agent_v1.spawn_agent(agent_type="Explore", message="...")`.

See `references/parallel-exploration.md` for patterns.

Mark the scout phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 1: Scouted [N] areas - [M] files, [K] tests found`

### Step 2: Diagnose Root Cause
Mark the diagnose phase `in_progress` via `manage_plan` when tracking is available.

**Mandatory skill chain:**
1. **Capture pre-fix state:** Record exact error messages, failing test output, stack traces.
2. Apply Deep Diagnosis (`references/debug/systematic-debugging.md`). Use `debugger` subagent if needed.
3. Activate `kit:sequential-thinking` — form hypotheses through structured reasoning.
4. Use delegated `Explore` subagents to test hypotheses only when delegation is explicitly requested/permitted.
5. If 2+ hypotheses fail → reframe: restate the problem, attack the assumption the failed hypotheses shared.
6. Trace backward to root cause (not just symptom location).

See `references/diagnosis-protocol.md` for full methodology.

Mark the diagnose phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 2: Diagnosed - Root cause: [summary], Evidence: [brief], Scope: [N files]`

### Step 3: Implement Fix
Mark the implementation phase `in_progress` once scout + diagnose are complete.

Fix the ROOT CAUSE per diagnosis findings. Not symptoms.

- If stuck, reframe: question the assumption the failed attempts shared
- Use `kit:sequential-thinking` for complex logic
- Minimal changes. Follow existing patterns.

Mark the implementation phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 3: Implemented - [N] files changed`

### Step 4: Verify + Prevent
Mark the verify phase `in_progress` via `manage_plan` when tracking is available.

**Mandatory skill chain:**
1. **Iron-law verify:** Re-run the EXACT commands from pre-fix state capture. Compare before/after.
2. **Regression test:** Add/update test(s) covering the fixed issue. Test MUST fail without fix, pass with fix.
3. **Side-effect sweep (HARD-GATE-NO-SIDE-EFFECTS):** Walk each dependent caller of changed functions from Step 1 blast-radius. Run tests in modules that share files/contracts. Confirm public contracts (signatures, schemas, APIs, env vars) unchanged. See SKILL.md HARD-GATE-NO-SIDE-EFFECTS.
4. **Defense-in-depth:** Apply prevention layers where applicable (see `references/prevention-gate.md`).
5. **Verification commands:** Run typecheck, lint, build, and tests through the
   `run_shell` capability. Delegate verification only when the user explicitly
   requested parallel delegation and the runtime permits it.

**On regression / side effect:** `ask_user capability` with 2-4 concrete options (revert / narrow scope / update dependents / accept). Never silently patch.

**If verification fails:** Loop back to Step 2 (re-diagnose). Max 3 attempts.

Mark the verify phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 4: Verified + Prevented - [before/after], [N] tests added, [M] guards`

### Step 5: Code Review
Mark the review phase `in_progress` via `manage_plan` when tracking is available.
Use `code-reviewer` through `delegate_agent` when delegation is explicitly
requested/permitted; otherwise review the changed files locally.

See `../../_shared/review-cycle.md` for mode-specific handling.

Mark the review phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 5: Review [score]/10 - [status]`

### Step 6: Finalize
Mark the finalize phase `in_progress` via `manage_plan` when tracking is available.
- Report summary: root cause, changes, prevention measures, confidence score
- Activate `kit:project-management` for task sync-back and plan status updates
- Update docs if needed via `docs-manager`
- Ask to commit via git workflow or delegated git-manager when explicitly requested/permitted
- Run `/kit:journal`

Mark the finalize phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 6: Complete - [action]`

## Skills/Subagents Activated

| Step | Skills/Subagents |
|------|------------------|
| 1 | `kit:scout` OR parallel `Explore` subagents when delegation is permitted |
| 2 | Deep Diagnosis (`references/debug/`), `kit:sequential-thinking`, optional delegated debugger/Explore when permitted, (reframe if 2+ hypotheses fail) |
| 3 | Reframing protocol (if stuck), `kit:sequential-thinking` (complex logic) |
| 4 | `run_shell` verification; optional delegated tester/workers when permitted |
| 5 | `code-reviewer` via `delegate_agent` when permitted, otherwise local review |
| 6 | `kit:project-management`; docs/git delegation only when permitted |

**Rules:** Don't skip steps. Validate before proceeding. One phase at a time.
**Frontend:** Use `kit:agent-browser`, Chrome MCP / `chrome-devtools-mcp`, or any relevant project-native browser tests to verify.
**Visual Assets:** Use `kit:codex` for visual asset generation; use the native `Read` tool for analysis and verification.
