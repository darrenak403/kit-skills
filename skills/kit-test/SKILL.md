---
name: kit:test
description: "Run unit, integration, e2e, and UI tests. Use for test execution, coverage analysis, build verification, visual regression, and QA reports."
user-invocable: true
when_to_use: "Invoke for running or designing validation suites."
category: utilities
keywords: [test, unit, integration, e2e, coverage]
argument-hint: "[context] OR ui [url]"
metadata:
  author: kit
  version: "1.0.0"
---

# Testing & Quality Assurance

Comprehensive testing framework covering code-level testing (unit, integration, e2e), UI/visual testing via browser automation, coverage analysis, and structured QA reporting.

## Default (No Arguments)

If invoked with context (test scope), proceed with testing. If invoked WITHOUT arguments, use `ask_user capability` to present available test operations:

| Operation   | Description                    |
| ----------- | ------------------------------ |
| `(default)` | Run unit/integration/e2e tests |
| `ui`        | Run UI tests on a website      |

Present as options via `ask_user capability` with header "Test Operation", question "What would you like to do?".

## Core Principle

**NEVER IGNORE FAILING TESTS.** Fix root causes, not symptoms. No mocks/cheats/tricks to pass builds.

Before reporting any pass/fail status, apply the evidence-before-claims gate: `../_shared/verification-before-completion.md`.

## When to Use

- **After implementation**: Validate new features or bug fixes
- **Coverage checks**: Ensure coverage meets project thresholds (80%+)
- **UI verification**: Visual regression, responsive layout, accessibility
- **Build validation**: Verify build process, dependencies, CI/CD compatibility
- **Pre-commit/push**: Final quality gate

## Workflows

### 1. Code Testing (`references/test-execution-workflow.md`)

Execute test suites, analyze results, generate coverage. Supports JS/TS (Jest/Vitest/Mocha), Python (pytest), Go, Rust, Flutter. Includes working process, quality standards, and tool commands.

**Load when:** Running unit/integration/e2e tests, checking coverage, validating builds

### 2. UI Testing (`references/ui-testing-workflow.md`)

Browser-based visual testing via `kit:agent-browser`, `kit:chrome-profile`, `kit:web-testing`, or project-native Playwright/Vitest/k6 commands. Covers screenshots, responsive checks, accessibility audits, form automation, and console error collection.

**Load when:** Visual regression testing, UI bugs, responsive layout checks, accessibility audits

### 3. Report Format (`references/report-format.md`)

Structured QA report template: test results overview, coverage metrics, failed tests, performance, build status, recommendations.

**Load when:** Generating test summary reports

## Quick Reference

```
Code tests     → test-execution-workflow.md
  npm test / pytest / go test / cargo test / flutter test
  Coverage: npm run test:coverage / pytest --cov

UI tests       → ui-testing-workflow.md
  Screenshots, responsive, a11y, forms, console errors
  Auth: chrome-profile for real user login/cookies, or project-native test setup

Reports        → report-format.md
  Structured QA summary with metrics & recommendations
```

## Working Process

1. Identify testing scope from recent changes or requirements
2. Run typecheck/analyze commands to catch syntax errors first
3. Execute appropriate test suites
4. Analyze results — focus on failures
5. Generate coverage reports if applicable
6. For frontend: run UI tests via `kit:agent-browser`, `kit:chrome-profile`, `kit:web-testing`, or project-native browser tests
7. Produce structured summary report

## Tools Integration

- **Test runners**: Jest, Vitest, Mocha, pytest, go test, cargo test, flutter test
- **Coverage**: Istanbul/c8/nyc, pytest-cov, go cover
- **Browser**: `kit:agent-browser` for live browser interaction without real user cookies; `kit:chrome-profile` for the user's actual Chrome login state, opened with `chrome-profile open --json` and bound by the returned selector; `kit:web-testing` or project-native Playwright/Vitest/k6 for repeatable UI tests
- **Analysis**: native `Read` tool for screenshot analysis
- **Debugging**: `kit:fix` (Deep Diagnosis) when tests reveal bugs requiring investigation
- **Thinking**: `kit:sequential-thinking` skill for complex test failure analysis

## Quality Standards

- All critical paths must have test coverage
- Validate happy path AND error scenarios
- Ensure test isolation — no interdependencies
- Tests must be deterministic and reproducible
- Clean up test data after execution
- Never ignore failing tests to pass the build

## Report Output

**IMPORTANT:** Invoke the `kit:project-organization` skill to organize the outputs.

Use naming pattern from `## Naming` section injected by hooks: `../_shared/output-naming.md`.

## Team Mode

When operating as teammate:

1. On start: check `manage_plan capability`, claim assigned/next unblocked task via `manage_plan capability`
2. Read full task description via `manage_plan capability` before starting
3. Wait for blocked tasks (implementation) to complete before testing
4. Respect file ownership — only create/edit test files assigned
5. When done: `manage_plan capability(status: "completed")` then `SendMessage` results to lead

**Fallback:** The task-management tool (create/update/read/list operations) is CLI-only — unavailable in VSCode extension. If it errors, use `manage_plan capability` for progress tracking and coordinate via `SendMessage` only.

## Workflow Position

**Typically follows:** `/kit:cook` (test after implementation), `/kit:fix` (test after bug fix)
**Typically precedes:** `kit:code-review` (review after tests pass)
**Related:** `/kit:cook` (implement then test), `/kit:fix` (fix then test)
