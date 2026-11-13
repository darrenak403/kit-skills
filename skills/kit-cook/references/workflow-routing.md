# Workflow Routing

Use this file when choosing the sequence for multi-step work. It is a routing
map only; load the owning `SKILL.md` before executing details.

## Core Sequences

| User intent | Sequence |
|---|---|
| Implement a feature | `kit:plan` -> `/kit:cook` -> `kit:test` -> `kit:code-review` |
| Execute an existing plan | `/kit:cook <plan-path>` |
| Quick implementation | `/kit:cook --fast` |
| Bug, error, failed test, or CI failure | `/kit:fix` |
| Investigate before deciding | `/kit:scout` -> `kit:fix` -> `/kit:brainstorm` -> `kit:plan` |
| Review a PR | `kit:review-pr <PR>` |
| Fix review feedback | `kit:review-pr <PR> --fix` or `/kit:fix --parallel` |
| Ship a completed branch | `kit:ship` |
| Explain work visually | `/kit:preview --explain` or `/kit:preview --html --diff` |
| Update project docs | `/kit:docs update` |

## Implementation Owner

- Use `/kit:cook` for known feature scope after requirements are clear.
- Use `/kit:fix` for concrete bugs, errors, test failures, and CI failures.
- Use `kit:plan` when work needs architecture, phases, file ownership, or TDD
  structure.
- Use `kit:test` for verification-only work.
- Use `kit:ship` only after implementation, tests, and review are done.

## Handoff Rules

- Domain skill first, workflow skill second. Example: for a React feature,
  route to `kit:frontend-design`, then execute through `kit:plan` and
  `/kit:cook` if implementation is needed.
- For visual explanations, load
  `../../preview/references/visual-explanation-routing.md`.
- For documentation changes, load
  `../../docs/references/documentation-management.md` or invoke
  `/kit:docs update`.
- If `find-skills` is installed and skill choice is ambiguous, load
  `../../find-skills/references/domain-routing.md`. Otherwise use the installed
  skill names and descriptions.

## Post-Implementation

- Review high-risk, cross-module, or public-contract changes before shipping.
- Update docs only when behavior, setup, commands, architecture, security
  posture, public contracts, or future maintainer decisions changed.
- Journal when a workflow creates durable decisions or debugging lessons.
