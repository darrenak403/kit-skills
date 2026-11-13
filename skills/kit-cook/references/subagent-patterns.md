# Subagent Patterns

Standard patterns for spawning and using subagents in cook workflows.

## Task Tool Pattern
```
delegate_agent capability(subagent_type="[type]", prompt="[task description]", description="[brief]")
```

## Research Phase
```
delegate_agent capability(subagent_type="researcher", prompt="Research [topic]. Report ≤150 lines.", description="Research [topic]")
```
- Use multiple researchers in parallel for different topics
- Keep reports ≤150 lines with citations

## Scout Phase
```
delegate_agent capability(subagent_type="Explore", prompt="Find files related to [feature] in codebase", description="Scout [feature]")
```
- Use `/kit:scout ext` (preferred) or `/kit:scout` (fallback)

## Planning Phase
```
delegate_agent capability(subagent_type="planner", prompt="Create implementation plan based on reports: [reports]. Save to [path]", description="Plan [feature]")
```
- Input: researcher and scout reports
- Output: `plan.md` + `phase-XX-*.md` files

## UI Implementation
```
delegate_agent capability(subagent_type="ui-ux-designer", prompt="Implement [feature] UI per ./docs/design-guidelines.md", description="UI [feature]")
```
- For frontend work
- Follow design guidelines

## Testing
```
delegate_agent capability(subagent_type="tester", prompt="Run test suite for plan phase [phase-name]", description="Test [phase]")
```
- Must achieve 100% pass rate

## Debugging
```
delegate_agent capability(subagent_type="debugger", prompt="Analyze failures: [details]", description="Debug [issue]")
```
- Use when tests fail
- Provides root cause analysis

## Code Review

Use the canonical (a)-(e) delegation prompt and mode-aware loop logic from `../../_shared/review-cycle.md` (substitute `[phase]` into the description).

## Conditional Simplify
```
delegate_agent capability(subagent_type="code-simplifier", prompt="Simplify these files while preserving behavior exactly: [file-list]", description="Simplify recent edits")
```
- Trigger when live `git diff --numstat HEAD --ignore-all-space` breaches any
  `simplify.threshold` from `.kit.json` (defaults: 400 LOC / 8 files / 200 single-file LOC)
- Scope the prompt to `git diff --name-only HEAD`
- Verify with `git diff --shortstat HEAD -- [file-list]` before/after the subagent;
  do not rely on the agent's prose summary
- Backstop: the `simplify-gate` hook re-checks the same thresholds on ship/commit-verb
  prompts and can warn or block independently of this step; see `workflow-steps.md` Step 3.S.

## Project Management
Activate the `the engineer project-management skill` skill (MANDATORY at Finalize — not a subagent):
> Run full sync-back in [plan-path]: reconcile completed tasks with all phase files, backfill stale completed checkboxes across all phases, update plan.md status/progress, and report unresolved mappings.

## Documentation
```
delegate_agent capability(subagent_type="docs-manager", prompt="Update docs for [phase]. Changed files: [list]", description="Update docs")
```

## Git Operations
```
delegate_agent capability(subagent_type="git-manager", prompt="Stage and commit changes with conventional commit message", description="Commit changes")
```

## Parallel Execution
```
delegate_agent capability(subagent_type="fullstack-developer", prompt="Implement [phase-file] with file ownership: [files]", description="Implement phase [N]")
```
- Launch multiple for parallel phases
- Include file ownership boundaries
