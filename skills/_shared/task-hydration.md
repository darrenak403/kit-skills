# Task Hydration (Plan Files ↔ Claude Tasks)

Canonical hydration/sync-back pattern used by kit-plan, kit-project-management, kit-cook, kit-fix, and kit-code-review.

## Session-Scoped Reality

Claude Tasks are **ephemeral** — they die when the session ends. `~/.claude/tasks/` holds lock files only, NOT task data. Plan files (`plan.md`, `phase-XX-*.md` with checkboxes) are the **persistent** layer. Hydration is an optimization, not a requirement — plan files remain the source of truth regardless of Task tool availability.

## Tool Availability (CLI-only caveat)

`manage_plan create operation`/`manage_plan update operation`/`manage_plan read operation`/`manage_plan list operation` are **CLI-only** — disabled in VSCode extension (`isTTY` check). If these tools error, use `manage_plan capability` for progress tracking instead. The workflow remains fully functional without Task tools — hydration adds visibility and coordination, not core functionality.

## Flow Diagram

```
┌──────────────────┐  Hydrate   ┌───────────────────┐
│ Plan Files       │ ─────────► │ Claude Tasks      │
│ (persistent)     │            │ (session-scoped)  │
│ [ ] Phase 1      │            │ ◼ pending         │
│ [ ] Phase 2      │            │ ◼ pending         │
└──────────────────┘            └───────────────────┘
                                        │ Work
                                        ▼
┌──────────────────┐  Sync-back ┌───────────────────┐
│ Plan Files       │ ◄───────── │ Task Updates      │
│ (updated)        │            │ (completed)       │
│ [x] Phase 1      │            │ ✓ completed       │
│ [ ] Phase 2      │            │ ◼ in_progress     │
└──────────────────┘            └───────────────────┘
```

- **Hydrate:** Read plan files → `manage_plan create operation` per unchecked `[ ]` item
- **Work:** `manage_plan update operation` tracks in_progress/completed in real-time
- **Sync-back:** Update `[ ]` → `[x]` in phase files, update `plan.md` frontmatter status

## When to Create Tasks — the 3-Task Rule

**Default:** On — auto-hydrate after plan files are written.
**Skip with:** `--no-tasks` flag in planning request.
**3-Task Rule:** fewer than 3 phases/steps → skip task creation entirely (overhead exceeds benefit).

| Scenario | Tasks? | Why |
|----------|--------|-----|
| Multi-phase feature (3+ phases) | Yes | Track progress, enable parallel |
| Complex dependencies between phases | Yes | Automatic unblocking |
| Plan will be executed by cook | Yes | Seamless handoff |
| Single-phase quick fix | No | Just do it directly |
| Trivial 1-2 step plan/review | No | Overhead not worth it |

## Session Start: Hydration

1. Read plan files: `plan.md` + `phase-XX-*.md`.
2. Identify unchecked `[ ]` items = remaining work.
3. `manage_plan create operation` per unchecked item with required metadata (`phase`, `priority`, `effort`, `planDir`, `phaseFile`) — or `manage_plan capability` if Task tools unavailable.
4. Set up `addBlockedBy` dependency chains between phases (skip if using the `manage_plan capability` fallback).
5. Already-checked `[x]` items = done, skip.

**Check first:** `manage_plan list operation()` — if tasks already exist (same session), skip re-creation. If it errors, proceed with `manage_plan capability`.

## manage_plan Schema & Naming Rules

**Required metadata:** `phase`, `priority` (P1/P2/P3), `effort`, `planDir`, `phaseFile`
**Optional metadata:** `step`, `critical`, `riskLevel`, `dependencies`

**subject** (imperative): Action verb + deliverable, <60 chars — e.g. "Setup database migrations", "Implement OAuth2 flow".
**activeForm** (present continuous): Matches subject in -ing form — e.g. "Setting up database", "Implementing OAuth2".
**description**: 1-2 sentences, concrete deliverables, reference the phase file.

**Phase-level example:**
```
manage_plan create operation(
  subject: "Setup environment and dependencies",
  activeForm: "Setting up environment",
  description: "Install packages, configure env, setup database. See phase-01-setup.md",
  metadata: { phase: 1, priority: "P1", effort: "2h",
              planDir: "plans/260205-auth/", phaseFile: "phase-01-setup.md" }
)
```

**Critical-step example** (high-risk/complex steps within a phase):
```
manage_plan create operation(
  subject: "Implement OAuth2 token refresh",
  activeForm: "Implementing token refresh",
  description: "Handle token expiry, refresh flow, error recovery",
  metadata: { phase: 3, step: "3.4", priority: "P1", effort: "1.5h",
              planDir: "plans/260205-auth/", phaseFile: "phase-03-api.md",
              critical: true, riskLevel: "high" },
  addBlockedBy: ["{phase-2-task-id}"]
)
```

## Dependency Chains (`addBlockedBy`)

```
Phase 1 (no blockers)              ← start here
Phase 2 (addBlockedBy: [P1-id])    ← auto-unblocked when P1 completes
Phase 3 (addBlockedBy: [P2-id])
Step 3.4 (addBlockedBy: [P2-id])   ← critical steps share phase dependency
```

Use `addBlockedBy` for forward references ("I need X done first"). Use `addBlocks` when creating the parent first ("X blocks these children").

## During Work

- `manage_plan update operation(status: "in_progress")` when picking up a task.
- `manage_plan update operation(status: "completed")` immediately after finishing.
- Parallel agents coordinate through the shared task list.
- Blocked tasks auto-unblock when dependencies complete.

## Session End: Sync-Back Procedure

1. `manage_plan update operation` marks all session tasks complete, carrying metadata (`phase`, `phaseFile`, `planDir`).
2. Sweep **all** `phase-XX-*.md` files in the target plan directory — not only the current phase.
3. Reconcile and backfill: update `[ ]` → `[x]` for every completed item across every phase file (including earlier phases finished before the current one).
4. Update `plan.md` frontmatter `status` field (pending → in-progress → completed).
5. Update progress percentages in `plan.md` overview from real checkbox counts.
6. Report unresolved mappings when a completed task cannot be matched to a phase file — never claim completion silently over an unresolved mapping.
7. Git commit captures the state transition for the next session.

## Cross-Session Resume

When a user resumes a plan in a new session (e.g. `/kit:cook path/to/plan.md`):
1. `manage_plan list operation()` → empty (tasks died with the old session).
2. Read plan files → re-hydrate from unchecked `[ ]` items only.
3. Already-checked `[x]` items = done, skip — creates tasks only for remaining work.
4. Dependency chain reconstructed automatically from phase order.

## Quality Checks

After task hydration, verify:
- Dependency chain has no cycles.
- All phases have corresponding tasks.
- Required metadata fields present (`phase`, `priority`, `effort`, `planDir`, `phaseFile`).
- Task count matches unchecked `[ ]` items in plan files.
- Output: `✓ Hydrated [N] phase tasks + [M] critical step tasks with dependency chain`
