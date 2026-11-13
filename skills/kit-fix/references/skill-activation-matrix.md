# Skill Activation Matrix

When to activate each skill and tool during fixing workflows.

## Always Activate (ALL Workflows)

| Skill/Tool | Step | Reason |
|------------|------|--------|
| `kit:scout` OR parallel `Explore` when permitted | Step 1 | Understand codebase context before diagnosing |
| Deep Diagnosis (`references/debug/`) | Step 2 | Systematic root cause investigation |
| `sequential-thinking` | Step 2 | Structured hypothesis formation — NO guessing |
| `the engineer project-management skill` | Step 6 | MANDATORY for sync-back and progress tracking, every fix |

## Task Orchestration (Moderate+ Only)

| Tool | Activate When |
|------|---------------|
| `manage_plan` | After complexity assessment, create/update phase tracking |
| `delegate_agent` | User explicitly requested subagents/delegation/parallel work and runtime permits it |

Skip plan orchestration for Quick workflow (< 3 steps). See `references/task-orchestration.md`.

## Auto-Triggered Activation

| Skill | Auto-Trigger Condition |
|-------|------------------------|
| Reframing protocol (restate problem, attack shared assumption) | 2+ hypotheses REFUTED in Step 2 diagnosis |
| `sequential-thinking` | Always in Step 2 (mandatory for hypothesis formation) |

## Conditional Activation

| Skill | Activate When |
|-------|---------------|
| `kit:brainstorm` | Multiple valid fix approaches, architecture decision (Deep only) |
| `kit:context-engineering` | Fixing AI/LLM/agent code, context window issues |
| Native `Read` tool | UI issues, screenshots provided, visual bugs |

## Subagent Usage

| Subagent | Activate When |
|----------|---------------|
| `debugger` | Root cause unclear, need deep investigation (Step 2) |
| `Explore` (parallel) | Scout multiple areas simultaneously (Step 1), test hypotheses (Step 2), only when delegation is explicitly requested/permitted |
| Verification workers | Verify implementation: typecheck, lint, build, test (Step 5), only when delegation is explicitly requested/permitted |
| `researcher` | External docs needed, latest best practices (Deep only) |
| `planner` | Complex fix needs breakdown, multiple phases (Deep only) |
| `tester` | After implementation, verify fix works (Step 5) |
| `kit:code-review` | After fix, verify quality and security (Step 5) |
| `git-manager` | After approval, commit changes (Step 6) |
| `docs-manager` | API/behavior changes need doc updates (Step 6) |
| `fullstack-developer` | Parallel independent issues (each gets own agent) |

## Parallel Patterns

See `references/parallel-exploration.md` for detailed patterns.

| When | Parallel Strategy |
|------|-------------------|
| Scouting (Step 1) | 2-3 `Explore` agents on different areas, only when delegation is permitted |
| Testing hypotheses (Step 2) | 2-3 `Explore` agents per hypothesis, only when delegation is permitted |
| Multi-module fix | `Explore` each module in parallel, only when delegation is permitted |
| After implementation (Step 5) | `run_shell`: typecheck + lint + build + test; delegate only when permitted |
| 2+ independent issues | Plan trees + delegated agents per issue when permitted |

## Workflow → Skills Map

| Workflow | Skills Activated |
|----------|------------------|
| Quick | `kit:scout` (minimal), Deep Diagnosis (`references/debug/`), `sequential-thinking`, `kit:code-review`, `the engineer project-management skill`, `run_shell` verification |
| Standard | Above + `manage_plan`, reframing protocol (auto), `kit:project-management`, optional delegated tester/Explore when permitted |
| Deep | All above + `kit:brainstorm`, `kit:context-engineering`, `researcher`, `planner` |
| Parallel | Per-issue plan trees + `kit:project-management` + delegated agents + coordination via `manage_plan` |

## Step → Skills Chain (Mandatory Order)

| Step | Mandatory Chain |
|------|----------------|
| Step 0: Mode | `ask_user capability` (unless auto/quick detected) |
| Step 1: Scout | `kit:scout` OR 2-3 parallel `Explore` when delegation is permitted → map files, deps, tests |
| Step 2: Diagnose | Capture pre-fix state → Deep Diagnosis (`references/debug/`) → `sequential-thinking` → optional delegated Explore hypotheses → (reframe if 2+ fail) |
| Step 3: Assess | Classify complexity → create plan tracking with `manage_plan` (moderate+) |
| Step 4: Fix | Implement per workflow → follow root cause |
| Step 5: Verify+Prevent | Iron-law verify → regression test → defense-in-depth → `run_shell` verify |
| Step 6: Finalize | Report → `the engineer project-management skill` (MANDATORY) → `docs-manager` → `manage_plan` → `git-manager` → `/kit:journal` |

## Detection Triggers

| Keyword/Pattern | Skill to Consider |
|-----------------|-------------------|
| "AI", "LLM", "agent", "context" | `kit:context-engineering` |
| "stuck", "tried everything" | Reframing protocol; `kit:brainstorm` for approach trade-offs |
| "complex", "multi-step" | `sequential-thinking` |
| "which approach", "options" | `kit:brainstorm` |
| "latest docs", "best practice" | `researcher` subagent |
| Screenshot attached | Native `Read` tool |
