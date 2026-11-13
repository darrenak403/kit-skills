# Plan Creation & Organization

## Directory Structure

### Plan Location

Use `Plan dir:` from `## Naming` section injected by hooks. This is the full computed path.

Default scope:
- project scope → `plans/251101-1505-authentication/`
- global scope → `{configured-global-plans-root}/251101-1505-authentication/`
  - Default when unset: `~/.claude/plans/251101-1505-authentication/`

Use global scope only when `--global` is explicit or there is no project context.

### File Organization

In the active scope root:
```
{plan-dir}/                                    # From `Plan dir:` in ## Naming
├── research/
│   ├── researcher-XX-report.md
│   └── ...
├── reports/
│   ├── scout-report.md
│   ├── researcher-report.md
│   └── ...
├── assets/                                    # Generated image sources for plan.html
├── plan.md                                    # Overview access point
├── plan.html                                  # Primary artifact when --html is used
├── phase-01-setup-environment.md              # Setup environment
├── phase-02-implement-database.md             # Database models
├── phase-03-implement-api-endpoints.md        # API endpoints
├── phase-04-implement-ui-components.md        # UI components
├── phase-05-implement-authentication.md       # Auth & authorization
├── phase-06-implement-profile.md              # Profile page
└── phase-07-write-tests.md                    # Tests
```

### Task Hydration

After creating plan.md and phase files, hydrate tasks (unless `--no-tasks`):
When `--html` is present, hydrate tasks only from the companion `plan.md`
index if it contains actionable checkboxes; otherwise skip hydration and state
that `plan.html` is the authoritative artifact.
1. manage_plan create operation per phase with `addBlockedBy` dependency chain
2. Add critical step tasks for high-risk items
3. See `task-management.md` for patterns and cook handoff protocol

### HTML Artifact Layout

When `--html` is present:
- Keep `plan.html` as the primary user-facing artifact.
- Keep `plan.md` as a concise index for metadata, GitHub links, and cook handoff
  compatibility when needed.
- Keep every `phase-*.md` as the detailed implementation contract when Markdown
  phase files are generated.
- Put generated image source files under `assets/`, then embed selected images
  in `plan.html` as data URIs.
- Verify the main page exposes every phase outline and that each outline opens
  a rendered markdown detail modal.
- Verify `plan.html` opens as a portable single file with no missing local asset
  paths.

### Active Plan State Tracking

See SKILL.md "Active Plan State" section for full rules. Key points:
- Check `## Plan Context` injected by hooks for active/suggested/none state
- After creating plan: use the active plan mechanism provided by the host project or dashboard
- Active plans use plan-specific reports path; suggested plans use default path

## Plan Creation via Write/Edit

After determining phases from research/design:

1. **Scaffold directly:**
   - Write `plan.md` using the frontmatter schema in `output-standards.md`.
   - Write each `phase-XX-*.md` using the Canonical Phase File Template from
     SKILL.md.

2. **Fill content sections** in plan.md via edit_file capability:
   - `## Overview` — brief description
   - `## Dependencies` — cross-plan dependencies

3. **Fill each phase-XX.md** with:
   - Architecture, implementation steps, success criteria
   - Requirements, risk assessment, security considerations

4. **Hand-edit the Phases table directly** for status toggles and structural
   changes — this is the only path. Keep the table structure exactly (columns,
   ordering) and keep each phase file's frontmatter `status` field in sync with
   the table cell.

5. **If `--html`, generate `plan.html` after final plan gates:**
   - Re-read `plan.md` and every `phase-*.md` that exists.
   - Extract visible phase outline summaries for the main page.
   - Render full phase markdown into click-open detail modals.
   - Embed generated watercolor technical sketch images when available.
   - Verify `plan.html` opens without missing local assets.

**MANDATORY:** Read any existing `plan.md`/`phase-*.md` before overwriting it —
Claude Code enforces Read-before-Write on existing files. In `--html` mode,
write the primary `plan.html` after planning gates finish so the HTML reflects
the reviewed plan. If `--github` is also present, write a concise Markdown
index only for the requested repo-relative `plan.md` link.

## File Structure

### Overview Plan (plan.md)

**IMPORTANT:** All plan.md files MUST include YAML frontmatter. See `output-standards.md` for schema.
When `--html` is active, `plan.md` may be a concise index instead of the full
plan body. It should link to `plan.html`, summarize phases, and keep GitHub
issue metadata stable.

**Example plan.md structure:**
```markdown
---
title: "Feature Implementation Plan"
description: "Add user authentication with OAuth2 support"
status: pending
priority: P1
effort: 8h
issue: 123
branch: kai/feat/oauth-auth
tags: [auth, backend, security]
blockedBy: []
blocks: [global:260115-0900-user-dashboard]
created: 2025-12-16
---

# Feature Implementation Plan

## Overview

Brief description of what this plan accomplishes.

## Cross-Plan Dependencies

| Relationship | Plan | Status |
|-------------|------|--------|
| Blocks | `global:260115-0900-user-dashboard` | pending |

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup Environment](./phase-01-setup.md) | Pending |
| 2 | [Core Implementation](./phase-02-impl.md) | Pending |
| 3 | [Testing & Validation](./phase-03-test.md) | Pending |

<!-- IMPORTANT: Link text MUST be human-readable names (not filenames).
     Bad:  [phase-01-setup.md](./phase-01-setup.md)
     Good: [Setup Environment](./phase-01-setup.md) -->

## Dependencies

- List key dependencies here
```

Reference rules:
- Bare refs stay in the current scope.
- Use `global:` or `project:` when the dependency crosses scopes.
- Read the target plan's `plan.md` frontmatter directly to inspect resolved dependency state.

**Guidelines:**
- Keep generic and under 80 lines
- List each phase with status/progress
- Link to detailed phase files
- Key dependencies

### Phase Files (phase-XX-name.md)
Fully respect the `./docs/development-rules.md` file.
Each phase file should contain:

**Context Links**
- Links to related reports, files, documentation

**Overview**
- Priority
- Current status
- Brief description

**Key Insights**
- Important findings from research
- Critical considerations

**Requirements**
- Functional requirements
- Non-functional requirements

**Architecture**
- System design
- Component interactions
- Data flow

**Related Code Files**
- List of files to modify
- List of files to create
- List of files to delete

**Implementation Steps**
- Detailed, numbered steps
- Specific instructions

**Todo List**
- Checkbox list for tracking

**Success Criteria**
- Definition of done
- Validation methods

**Risk Assessment**
- Potential issues
- Mitigation strategies

**Security Considerations**
- Auth/authorization
- Data protection

**Next Steps**
- Dependencies
- Follow-up tasks

### Deep / TDD Extensions

When `--deep` is used, add:
- a file inventory table with action, rough size, and test impact
- a test scenario matrix for critical, high, and medium paths
- a dependency map that calls out links to other phases

When `--tdd` is used, add:
- a **Tests Before** section for regression coverage written first
- a **Refactor** section describing the protected code changes
- a **Tests After** section for new behavior introduced in that phase
- a regression gate listing the compile/test command that must pass
