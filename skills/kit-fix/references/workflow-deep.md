# Deep Workflow

Full pipeline with research, brainstorming, and planning for complex issues. Use
the runtime's `manage_plan` capability for dependency tracking. Claude Code
exposes this as task-style tools; Codex Desktop exposes plan update tools
instead.

## Plan Setup (Before Starting)

Create phase tracking upfront with `manage_plan`. Steps 1+2+3 may run in
parallel when the runtime permits the needed delegation.

- Scout codebase
- Diagnose root cause
- Research solutions
- Brainstorm approaches, blocked by scout + diagnose + research
- Create implementation plan, blocked by brainstorm
- Implement fix, blocked by plan
- Verify + prevent, blocked by implementation
- Code review, blocked by verification
- Finalize & docs, blocked by review

## Steps

### Step 1: Scout Codebase (parallel with Steps 2+3)
Mark the scout phase `in_progress` via `manage_plan` when tracking is available.

**Mandatory:** Activate `kit:scout` skill or, when delegation is permitted,
launch 2-3 `Explore` subagents in parallel through `delegate_agent`. In Codex
Desktop, expose deferred multi-agent tools with `tool_search` first, then use
`multi_agent_v1.spawn_agent(agent_type="Explore", message="...")`.

Map: all affected files, module boundaries, call chains, test coverage gaps.

See `references/parallel-exploration.md` for patterns.

Mark the scout phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 1: Scouted - [N] files, system impact: [scope]`

### Step 2: Diagnose Root Cause (parallel with Steps 1+3)
Mark the diagnose phase `in_progress` via `manage_plan` when tracking is available.

**Mandatory skill chain:**
1. **Capture pre-fix state:** Record ALL error messages, failing tests, stack traces, logs.
2. Apply Deep Diagnosis (`references/debug/systematic-debugging.md` + `references/debug/root-cause-tracing.md`).
3. Activate `sequential-thinking` — structured hypothesis formation.
4. Use delegated `Explore` subagents to test hypotheses only when delegation is explicitly requested/permitted.
5. If 2+ hypotheses fail → reframe: restate the problem, attack the assumption the failed hypotheses shared.
6. Trace backward through call chain to ROOT CAUSE origin.

See `references/diagnosis-protocol.md` for full methodology.

Mark the diagnose phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 2: Diagnosed - Root cause: [summary], Evidence: [chain]`

### Step 3: Research (parallel with Steps 1+2)
Mark the research phase `in_progress` via `manage_plan` when tracking is available.
Use `researcher` through `delegate_agent` only when delegation is explicitly requested/permitted.

- Search latest docs, best practices
- Find similar issues/solutions
- Gather security advisories if relevant

Mark the research phase `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 3: Research complete - [key findings]`

### Step 4: Brainstorm
Mark brainstorm `in_progress` after scout + diagnose + research are complete.
Activate `kit:brainstorm` skill.

- Evaluate multiple approaches using scout + diagnosis + research findings
- Consider trade-offs
- Get user input on preferred direction

Mark brainstorm `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 4: Approach selected - [chosen approach]`

### Step 5: Plan
Mark plan creation `in_progress` via `manage_plan` when tracking is available.
Use delegated `planner` only when delegation is explicitly requested/permitted;
otherwise write the plan locally.

- Break down into phases
- Identify dependencies
- Define success criteria
- Include prevention measures in plan

Mark plan creation `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 5: Plan created - [N] phases`

### Step 6: Implement
Mark implementation `in_progress` via `manage_plan` when tracking is available.
Implement per plan. Use `kit:context-engineering`, `sequential-thinking`; reframe when stuck.

- Fix ROOT CAUSE per diagnosis — not symptoms
- Follow plan phases
- Minimal changes per phase

Mark implementation `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 6: Implemented - [N] files, [M] phases`

### Step 7: Verify + Prevent
Mark verification `in_progress` via `manage_plan` when tracking is available.

**Mandatory skill chain:**
1. **Iron-law verify:** Re-run EXACT commands from pre-fix state. Compare before/after.
2. **Regression test:** Add comprehensive tests. Tests MUST fail without fix, pass with fix.
3. **Side-effect sweep (HARD-GATE-NO-SIDE-EFFECTS):** Walk each dependent caller of changed functions from Step 1 blast-radius. Run tests in modules that share files/contracts. Confirm public contracts (signatures, schemas, APIs, env vars) unchanged. See SKILL.md HARD-GATE-NO-SIDE-EFFECTS.
4. **Defense-in-depth:** Apply all relevant prevention layers (see `references/prevention-gate.md`).
5. **Verification commands:** Run typecheck + lint + build + test through `run_shell`; delegate only when explicitly requested/permitted.
6. **Edge cases:** Test boundary conditions, security implications, performance impact.

**On regression / side effect:** `ask_user capability` with 2-4 concrete options (revert / narrow scope / update dependents / accept). Never silently patch.

**If verification fails:** Loop back to Step 2 (re-diagnose). Max 3 attempts → question architecture.

See `references/prevention-gate.md` for prevention requirements.

Mark verification `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 7: Verified + Prevented - [before/after], [N] tests, [M] guards`

### Step 8: Code Review
Mark review `in_progress` via `manage_plan` when tracking is available.
Use delegated `code-reviewer` only when delegation is explicitly requested/permitted; otherwise review locally.

See `../../_shared/review-cycle.md` for mode-specific handling.

Mark review `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 8: Review [score]/10 - [status]`

### Step 9: Finalize
Mark finalize `in_progress` via `manage_plan` when tracking is available.
- Report summary: root cause, evidence chain, changes, prevention measures, confidence score
- Activate `kit:project-management` for task sync-back, plan status updates, and progress tracking
- Use delegated docs-manager/git-manager only when explicitly requested/permitted
- Run `/kit:journal`

Mark finalize `completed` via `manage_plan` when tracking is available.
**Output:** `✓ Step 9: Complete - [actions taken]`

## Skills/Subagents Activated

| Step | Skills/Subagents |
|------|------------------|
| 1 | `kit:scout` OR parallel `Explore` subagents when delegation is permitted |
| 2 | Deep Diagnosis (`references/debug/`), `sequential-thinking`, optional delegated Explore when permitted, (reframe if 2+ hypotheses fail) |
| 3 | `researcher` via `delegate_agent` when permitted |
| 4 | `kit:brainstorm` |
| 5 | `planner` |
| 6 | `sequential-thinking`, `kit:context-engineering` |
| 7 | `run_shell` verification; optional delegated tester when permitted |
| 8 | `code-reviewer` via `delegate_agent` when permitted, otherwise local review |
| 9 | `kit:project-management`; docs/git delegation only when permitted |

**Rules:** Don't skip steps. Validate before proceeding. One phase at a time.
**Frontend:** Use `kit:agent-browser`, Chrome MCP / `chrome-devtools-mcp`, or any relevant project-native browser tests to verify.
**Visual Assets:** Use `kit:codex` for visual asset generation; use the native `Read` tool for analysis and verification.
