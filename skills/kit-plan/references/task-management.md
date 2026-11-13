# Task Management Integration

Session-scoped reality, the hydration/sync-back flow diagram, the 3-Task Rule, `manage_plan` schema + naming rules, and `addBlockedBy` dependency chains are shared doctrine: `../../_shared/task-hydration.md`.

## User-Approved Cook Continuation

### Same-Session (user approves cook in current session)

1. Planning hydrates tasks → tasks exist in session
2. Agent stops and asks the user which next step they want
3. If the user approves implementation, Cook Step 3: `manage_plan list operation` → finds existing tasks → picks them up
4. Cook skips re-creation and begins the approved implementation path

### Cross-Session (new session, resume plan)

Same as the shared Cross-Session Resume procedure, entered via `/kit:cook path/to/plan.md`.

### Sync-Back (cook Step 6)

Follows the shared sync-back procedure; delta: the `project-manager` subagent runs the full-plan sync-back on kit-plan's behalf.

## Quality Checks

See `../../_shared/task-hydration.md` Quality Checks.
