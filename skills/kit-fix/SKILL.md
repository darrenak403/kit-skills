---
name: kit:fix
description: "Fix bugs, errors, test failures, and CI/CD issues with intelligent routing. Use for type errors, lint issues, log errors, UI bugs, code problems."
user-invocable: true
when_to_use: "Invoke when there is a concrete bug, error, or CI failure."
category: utilities
keywords: [bugfix, error, test-failure, CI, lint]
argument-hint: "[issue] --auto|--review|--quick|--parallel"
metadata:
  author: kit
  version: "2.1.0"
---

# Fixing

Unified skill for fixing issues of any complexity with intelligent routing.

## Arguments

- `--auto` - Activate autonomous mode (**default**)
- `--review` - Activate human-in-the-loop review mode
- `--quick` - Activate quick mode
- `--parallel` - Activate parallel mode: route to parallel `fullstack-developer` agents per issue

<HARD-GATE>
Do NOT propose or implement fixes before completing Steps 1-2 (Scout + Diagnose).
Symptom fixes are failure. Find the cause first through structured analysis, NEVER guessing.
If 3+ fix attempts fail, STOP and question the architecture — discuss with user before attempting more.
User override: `--quick` mode allows fast scout→diagnose→fix cycle for trivial issues (lint, type errors).
</HARD-GATE>

<HARD-GATE-SCOUT-FIRST>
Always scan the codebase BEFORE asking clarifying questions or forming hypotheses. Mandatory scout outputs (collect before Step 2):
1. Project type, language(s), framework(s) — from package.json/pyproject.toml/go.mod/etc.
2. The exact file(s) where the symptom surfaces + their direct callers/dependents
3. Related tests covering the affected area
4. Recent commits (`git log --oneline -20`) touching scouted files — possible introducer
5. Existing patterns/conventions for this kind of code (so the fix matches them)

State a 3-6 bullet codebase-context summary to the user before asking questions.

Shared pattern/rationale: `../_shared/scout-first.md`.
</HARD-GATE-SCOUT-FIRST>

<HARD-GATE-EXACT-ROOT-CAUSE>
Do NOT propose a fix until you can answer ALL of these in one concrete sentence each:

1. **Exact symptom**: precise error message / failing assertion / observed behavior (copy verbatim, not paraphrased).
2. **Reproduction steps**: minimal sequence that triggers it (commands, inputs, environment).
3. **Expected vs actual**: what SHOULD happen vs what DOES happen.
4. **Root cause** (not symptom): the underlying defect — a specific line, missing check, race condition, contract violation, or design flaw. Cite file:line evidence.
5. **Why now**: what change/condition exposed it (recent commit, data shape, env, dep upgrade).
6. **Blast radius**: every code path that depends on the broken behavior or shares the same root cause.

If ANY item is vague ("probably", "I think", "something with…"), use `ask_user capability` to gather missing facts (logs, repro, env) OR run more scout/debug — never guess.

Use `ask_user capability` with options grounded in scout findings (specific files, specific commits, specific functions) — never abstract.
</HARD-GATE-EXACT-ROOT-CAUSE>

<HARD-GATE-NO-SIDE-EFFECTS>
The fix is NOT done until verified to be side-effect-free. Step 5 MUST prove the 5 obligations + follow the escalation procedure in `../_shared/no-side-effects.md`.

Delta: item 1 = original symptom no longer reproduces (re-run exact pre-fix repro from Step 2); item 3's blast radius = the one identified during diagnosis (Step 2).
</HARD-GATE-NO-SIDE-EFFECTS>

## Anti-Rationalization

| Thought                                | Reality                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| "I can see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. Scout first.       |
| "Quick fix for now, investigate later" | "Later" never comes. Fix properly now.                         |
| "Just try changing X"                  | Random fixes waste time and create new bugs. Diagnose first.   |
| "It's probably X"                      | "Probably" = guessing. Use structured diagnosis. Verify first. |
| "One more fix attempt" (after 2+)      | 3+ failures = wrong approach. Question architecture.           |
| "Emergency, no time for process"       | Systematic diagnosis is FASTER than guess-and-check.           |
| "I already know the codebase"          | Knowledge decays. Scout to verify assumptions before acting.   |
| "The fix is done, tests pass"          | Without prevention, same bug class will recur. Add guards.     |

## Process Flow (Authoritative)

```mermaid
flowchart TD
    A[Issue Input] --> B[Step 0: Mode Selection]
    B --> C[Step 1: Scout - Understand Context]
    C --> D[Step 2: Diagnose - Structured Root Cause Analysis]
    D --> E[Step 3: Complexity Assessment + Task Orchestration]
    E -->|Simple| F[Quick Workflow]
    E -->|Moderate| G[Standard Workflow]
    E -->|Complex| H[Deep Workflow]
    E -->|Parallel| I[Multi-Agent Fix]
    F --> J[Step 4: Fix Implementation]
    G --> J
    H --> J
    I --> J
    J --> K[Step 5: Verify + Prevent]
    K -->|Pass + Prevention in place| L[Step 6: Finalize]
    K -->|Fail, <3 attempts| D
    K -->|Fail, 3+ attempts| M[Question Architecture]
    M --> N[Discuss with User]
    L --> O[Report + Docs + Journal]
```

**This diagram is the authoritative workflow.** If prose conflicts with this flow, follow the diagram.

## Workflow

### Step 0: Mode Selection

**First action:** If there is no "auto" keyword in the request, use `ask_user capability` to determine workflow mode:

| Option                       | Recommend When                  | Behavior                                   |
| ---------------------------- | ------------------------------- | ------------------------------------------ |
| **Autonomous** (default)     | Simple/moderate issues          | Auto-approve if score >= 9.5 & 0 critical  |
| **Human-in-the-loop Review** | Critical/production code        | Pause for approval at each step            |
| **Quick**                    | Type errors, lint, trivial bugs | Fast scout → diagnose → fix → review cycle |

See `references/mode-selection.md` for ask_user capability format.

### Step 1: Scout (MANDATORY — never skip)

**Purpose:** Understand the affected codebase BEFORE forming any hypotheses.

**Mandatory skill chain:**

1. Activate `kit:scout` skill OR launch 2-3 parallel `Explore` subagents
2. Discover: affected files, dependencies, related tests, recent changes (`git log`)
3. Read `./docs` for project context if unfamiliar

**Quick mode:** Minimal scout — locate affected file(s) and their direct dependencies only.
**Standard/Deep mode:** Full scout — map module boundaries, test coverage, call chains.

**Output:** `✓ Step 1: Scouted - [N] files mapped, [M] dependencies, [K] tests found`

### Step 2: Diagnose (MANDATORY — never skip)

**Purpose:** Structured root cause analysis. NO guessing. Evidence-based only.

**Mandatory skill chain:**

1. **Capture pre-fix state:** Record exact error messages, failing test output, stack traces, log snippets. This becomes the baseline for Step 5 verification.
2. Apply the Deep Diagnosis framework below (`references/debug/systematic-debugging.md` + `references/debug/root-cause-tracing.md`).
3. Activate `kit:sequential-thinking` skill — form hypotheses through structured reasoning, NOT guessing.
4. Spawn parallel `Explore` subagents to test each hypothesis against codebase evidence.
5. If 2+ hypotheses fail → STOP and reframe: restate the problem from scratch, identify the assumption every failed hypothesis shared, and attack that assumption from a different angle (data-first, environment-first, timing-first).
6. Create diagnosis report: confirmed root cause, evidence chain, affected scope.

Use the root-cause checklist above as the authoritative diagnosis protocol.

**Output:** `✓ Step 2: Diagnosed - Root cause: [summary], Evidence: [brief], Scope: [N files]`

### Step 3: Complexity Assessment & Task Orchestration

Classify before routing. See `references/complexity-assessment.md`.

| Level        | Indicators                                 | Workflow                              |
| ------------ | ------------------------------------------ | ------------------------------------- |
| **Simple**   | Single file, clear error, type/lint        | `references/workflow-quick.md`        |
| **Moderate** | Multi-file, root cause unclear             | `references/workflow-standard.md`     |
| **Complex**  | System-wide, architecture impact           | `references/workflow-deep.md`         |
| **Parallel** | 2+ independent issues OR `--parallel` flag | Parallel `fullstack-developer` agents |

**Task Orchestration (Moderate+ only):** After classifying, create native Claude Tasks for all phases upfront with dependencies.

- Skip for Quick workflow (< 3 steps, overhead exceeds benefit)
- Use `manage_plan capability` with `addBlockedBy` for dependency chains
- Update via `manage_plan capability` as each phase completes
- For Parallel: create separate task trees per independent issue
- **Fallback:** The `manage_plan` task-management tool is CLI-only — unavailable in VSCode extension. If it errors, the fix workflow remains fully functional without progress tracking. Full hydrate/sync-back doctrine: `../_shared/task-hydration.md`.

### Step 4: Fix Implementation

- Implement fix per selected workflow, updating Tasks as phases complete.
- Follow diagnosis findings — fix the ROOT CAUSE, not symptoms.
- Minimal changes only. Follow existing patterns.

### Step 5: Verify + Prevent (MANDATORY — never skip)

**Purpose:** Prove the fix works, has NO side effects, and prevents the same bug class from recurring. See HARD-GATE-NO-SIDE-EFFECTS.

**Mandatory skill chain:**

1. **Verify (iron-law):** Run the EXACT commands from pre-fix state capture. Compare output. NO claims without fresh evidence.
2. **Regression test:** Add or update test(s) that specifically cover the fixed issue. The test MUST fail without the fix and pass with it.
3. **Side-effect sweep (NEW):** Run tests across the full **blast radius** identified in Step 2 (not just the modified file). Walk each dependent code path. Confirm public contracts unchanged (signatures, response shapes, DB schemas, env vars).
4. **Code review (delegate):** Spawn `code-reviewer` subagent using the canonical delegation prompt in `../_shared/review-cycle.md` — fix-specific delta: swap item (a) to "root cause actually addressed (not symptom-patched)" and add "(f) no new failure modes introduced". Pass scout summary + diagnosis report as context.
5. **Prevention gate:** Apply defense-in-depth validation where applicable.
6. **Parallel verification:** Launch `run_shell capability` agents for typecheck + lint + build + test.

**If verification fails OR a side effect is detected:** Use `ask_user capability` per HARD-GATE-NO-SIDE-EFFECTS — present what broke, why, and 2-4 concrete options (revert, narrow scope, update dependents, accept). Never silently patch.

**If verification fails:** Loop back to Step 2 (re-diagnose). After 3 failures → question architecture, discuss with user.

Use the verification checklist above for prevention requirements.

**Output:** `✓ Step 5: Verified + Prevented - [before/after comparison], [N] tests added, [M] guards added`

### Step 6: Finalize (MANDATORY — never skip)

1. Report summary: confidence score, root cause, changes, files, prevention measures, side-effect sweep results
2. **Activate `the engineer project-management skill` skill (MANDATORY)** → sync plan/task status (if fix is part of a plan), update progress, hydrate Claude Tasks, generate status report
3. `docs-manager` subagent → update `./docs` if changes warrant (NON-OPTIONAL)
4. `manage_plan capability` → mark ALL Claude Tasks `completed` (skip if Task tools unavailable)
5. Ask user if they want to commit via `git-manager` subagent
6. Run `/kit:journal` to write a concise technical journal entry upon completion

---

## IMPORTANT: Skill/Subagent Activation Matrix

See `references/skill-activation-matrix.md` for complete matrix.

**Always activate (ALL workflows):**

- `kit:scout` (Step 1) — understand before diagnosing
- Deep Diagnosis framework (Step 2) — `references/debug/` systematic root cause investigation
- `kit:sequential-thinking` (Step 2) — structured hypothesis formation

**Always activate (Step 6 Finalize):**

- `kit:project-management` — MANDATORY for sync-back and progress tracking, every fix

**Conditional:**

- Reframing protocol — when 2+ hypotheses fail in Step 2, restate the problem and attack the assumption the failed hypotheses shared
- `kit:brainstorm` — multiple valid approaches, architecture decision (Deep only)
- `kit:context-engineering` — fixing AI/LLM/agent code

**Subagents:** `debugger`, `researcher`, `planner`, `code-reviewer`, `tester`, `run_shell capability`
**Parallel:** Multiple `Explore` agents for scouting, `run_shell capability` agents for verification

## Output Format

Unified step markers:

```
✓ Step 0: [Mode] selected
✓ Step 1: Scouted - [N] files, [M] deps
✓ Step 2: Diagnosed - Root cause: [summary]
✓ Step 3: [Complexity] detected - [workflow] selected
✓ Step 4: Fixed - [N] files changed
✓ Step 5: Verified + Prevented - [tests added], [guards added]
✓ Step 6: Complete - [action taken]
```

## Deep Diagnosis

Absorbed debugging framework (formerly a standalone skill). Core principle: **NO
FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.** Escalate from quick-fix to
systematic root-cause work as soon as the cause is not proven:

```
Code bug       → references/debug/systematic-debugging.md (Phase 1-4)
  Deep in stack  → references/debug/root-cause-tracing.md (trace backward)
  Test pollution → scripts/find-polluter.sh (bisect the polluter)
  Found cause    → references/debug/defense-in-depth.md (add layers)
  Claiming done  → ../_shared/verification-before-completion.md (verify first)

System issue   → references/debug/investigation-methodology.md (5 steps)
  CI/CD failure  → references/debug/log-and-ci-analysis.md
  Slow system    → references/debug/performance-diagnostics.md
  Need report    → references/debug/reporting-standards.md

Frontend fix   → references/debug/frontend-verification.md
Multi-step     → references/debug/task-management-debugging.md
```

## References

Load as needed:

- `references/mode-selection.md` - ask_user capability format for mode
- `references/complexity-assessment.md` - Classification criteria
- `references/workflow-quick.md` - Quick: scout → diagnose → fix → verify+prevent → review
- `references/workflow-standard.md` - Standard: full pipeline with Tasks
- `references/workflow-deep.md` - Deep: research + brainstorm + plan with Tasks
- `../_shared/review-cycle.md` - Review logic (autonomous vs HITL), canonical delegation prompt, Quick Mode threshold delta
- `references/skill-activation-matrix.md` - When to activate each skill
- `references/parallel-exploration.md` - Parallel Explore/run_shell capability/Task coordination patterns

**Specialized Workflows:**

- `references/workflow-ci.md` - GitHub Actions/CI failures
- `references/workflow-logs.md` - Application log analysis
- `references/workflow-test.md` - Test suite failures
- `references/workflow-types.md` - TypeScript type errors
- `references/workflow-ui.md` - Visual/UI issues (requires design skills)

**Deep Diagnosis framework (absorbed debugging skill):**

- `references/debug/systematic-debugging.md` - Four-phase root cause framework
- `references/debug/root-cause-tracing.md` - Trace backward through the call stack
- `references/debug/defense-in-depth.md` - Layered validation after the fix
- `../_shared/verification-before-completion.md` - Fresh-evidence completion protocol (delta: Step 5 here also requires the pre-fix baseline commands re-run verbatim and a red-green regression test, see Step 5 above)
- `references/debug/investigation-methodology.md` - System-level 5-step investigation
- `references/debug/log-and-ci-analysis.md` - Logs + GitHub Actions analysis
- `references/debug/performance-diagnostics.md` - Bottleneck + query diagnostics
- `references/debug/reporting-standards.md` - Diagnostic report structure
- `references/debug/task-management-debugging.md` - Investigation task tracking
- `references/debug/frontend-verification.md` - Visual verification of UI fixes
- `scripts/find-polluter.sh` - Bisect test pollution to the polluting file

## Workflow Position

**Typically follows:** `/kit:scout` (after locating affected code)
**Typically precedes:** `kit:code-review` (review the fix), `kit:test` (validate the fix)
**Related:** `/kit:cook` (alternative for feature work)
