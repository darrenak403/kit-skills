# Skill Workflow Routing

When orchestrating multi-step tasks, consider these workflow sequences. Skills are listed in typical execution order.

## Core Development Workflow

```
/kit:plan → /kit:cook → /kit:test → /kit:code-review → /kit:ship → /kit:journal
```

| User Intent | Suggested Start |
|-------------|----------------|
| "implement feature X", "build X", "add X" | `/kit:plan` then `/kit:cook` |
| "execute this plan" | `/kit:cook <plan-path>` |
| "quick implementation" | `/kit:cook --fast` |

## Bugfix Workflow

```
/kit:scout → /kit:fix → /kit:test → /kit:code-review
```

| User Intent | Suggested Start |
|-------------|----------------|
| "X is broken", "error in X", "bug in X" | `/kit:fix` (auto-scouts internally) |
| "CI is failing", "tests broken" | `/kit:fix --auto` |
| "investigate why X happens" | `/kit:scout` then `/kit:fix` (Deep Diagnosis) |

## Investigation Workflow

```
/kit:scout → /kit:fix → /kit:brainstorm → /kit:plan
```

| User Intent | Suggested Start |
|-------------|----------------|
| "understand how X works" | `/kit:scout` |
| "why is X happening" | `/kit:fix` (Deep Diagnosis) |
| "explore options for X" | `/kit:brainstorm` then `/kit:plan` |

## Post-Implementation Checklist

After completing implementation work, consider:
- `/kit:code-review` — review changes before merging
- `/kit:ship` — run full shipping pipeline (tests, review, version, PR)
- `/kit:journal` — document decisions and lessons learned

## Setup Skills

Before starting implementation in a shared codebase:
- `/kit:worktree` — create isolated worktree for the feature/fix
- `/kit:scout` — discover relevant files and code patterns
