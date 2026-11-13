# Hydration Workflow

Tasks are **session-scoped** — they disappear when the session ends. Plan files are the **persistent** layer. Flow diagram, CLI-only tool caveat, hydration/sync-back/cross-session-resume procedures, and the `manage_plan` schema: `../../_shared/task-hydration.md`.

## Compound Interest Effect

Each hydration cycle makes specs smarter:
- **Session 1:** Execute first tasks, establish patterns
- **Session 2:** See completed work, build on established patterns
- **Session 3:** Full context of prior sessions, fewer clarifications needed

Git history shows progression. Completed checkboxes show the path that worked. Specs gain **institutional memory** across sessions.

## YAML Frontmatter Sync

Plan files MUST have frontmatter with these fields:

```yaml
---
title: Feature name
description: Brief description
status: in-progress  # pending | in-progress | completed
priority: P1
effort: medium
branch: feature-branch
tags: [auth, api]
created: 2026-02-05
---
```

Update `status` field during sync-back when plan state changes.
