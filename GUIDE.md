# Kit Skills Guide

[English](GUIDE.md) | [Tiếng Việt](GUIDE.vi.md)

This guide introduces the core workflows first. Specialist skills are supporting capabilities selected by the core workflow when needed; you do not need to memorize them to get started.

## Configure the kit

The project-owned `.kit.json` is the single configuration source for the kit. Install Kit Skills first by following [README.md](README.md#install), then adjust this file in the target project. Keep its `$schema` reference for editor validation.

| Setting | Default / examples | Use it for |
| --- | --- | --- |
| `codingLevel` | `-1` (automatic), `0`–`5` | Controls explanation depth, from ELI5 to tech-lead/god-mode. |
| `locale.thinkingLanguage`, `locale.responseLanguage` | `null`, or e.g. `"vi"` | Sets the language used for reasoning/output when the runtime supports it. |
| `docs.maxLoc` | `800` | Sets the preferred maximum length of a documentation file. |
| `paths.docs`, `paths.plans` | `"docs"`, `"plans"` | Aligns generated documentation and plans with project conventions. |
| `project.type`, `packageManager`, `framework` | `"auto"` | Overrides automatic project detection when it is wrong or ambiguous. |
| `plan` | naming, resolution, validation | Controls plan naming, branch matching, required questions, and focus areas. |
| `simplify` | thresholds and gate verbs | Warns or blocks shipping prompts when a diff is unusually large or complex. |
| `hooks` | eight `true`/`false` switches | Enables the kit's safety and session hooks. |
| `trust` | disabled | Configures trust mode; keep disabled unless your team has a reviewed policy for it. |
| `subagent.agents` | optional context prefix | Adds project-specific context to a particular subagent type. |
| `assertions` | empty list | Records project-specific code rules as pattern/rule/message assertions. |

Start with a small, explicit override rather than copying a large configuration:

```json
{
  "$schema": "./schemas/kit-config.schema.json",
  "codingLevel": 3,
  "locale": { "responseLanguage": "en" },
  "paths": { "docs": "docs", "plans": "plans" },
  "plan": { "validation": { "mode": "prompt" } },
  "hooks": { "privacy-block": true, "scout-block": true, "simplify-gate": true }
}
```

### Hook and simplify policy

Keep all eight hooks enabled unless a documented project policy replaces their protection. `privacy-block` guards likely secret files; `scout-block` prevents unnecessarily broad scans; `secret-output-guardrail` avoids revealing detected secrets; `session-init`, `subagent-init`, and `session-state` maintain working context; `dev-rules-reminder` reinjects rules; `simplify-gate` checks large diffs.

`simplify.threshold.locDelta`, `fileCount`, and `singleFileLoc` define the diff signals. `simplify.gate.hardVerbs` blocks high-impact prompts such as ship/merge/deploy when a threshold is breached; `softVerbs` warns for lower-impact actions. Tune numbers to your repository's normal change size, not to suppress warnings.

### External and project customisation

Use external integrations only after confirming authentication, data-handling policy, cost, and whether project context may leave the machine. Gemini is opt-in: set `skills.research.useGemini: true` only after the Gemini CLI is working; use `kit:scout ext` only with explicit consent. Do not put tokens, passwords, or API keys in `.kit.json`.

For project-specific behavior, prefer `.kit.json` settings, project rules, and custom skill configuration under `skills.<skill-name>`. Keep runtime-native Claude/Codex customisation separate from the kit source; generated `.claude/` or `.codex/` directories can be replaced during a later installation. Validate any change against [`schemas/kit-config.schema.json`](schemas/kit-config.schema.json) and keep it under version control when it is a team convention.

The privacy, broad-scan, secret-output, session-state, development-rule, and simplify hooks are safeguards, not a replacement for CI, access controls, human review, or secret management. See [`.kit.json`](.kit.json) for the default configuration.

## First session

Open Claude Code or Codex in the root of a project where Kit Skills is installed. Give the agent enough information to choose the right level of autonomy:

```text
Goal: <outcome to achieve>.
Context: <symptom, issue, module, or relevant flow>.
Scope: <what may change>; do not change: <boundaries>.
Done when: <behaviour, tests, and review criteria>.
Stop point: <ask before editing | make a plan first | implement now>.
```

For example:

```text
Goal: fix the login endpoint returning 500 for a missing email.
Context: POST /api/login fails locally.
Scope: validation and its tests only; do not change the database schema.
Done when: the endpoint returns 400, the regression test passes, and valid login is unchanged.
Stop point: investigate and explain the root cause before editing code.
```

## Choose the workflow level

| Level | Use it for | Start with | Your role |
| --- | --- | --- | --- |
| Basic | An isolated bug or a small, familiar change | `scout → fix --review → test → code-review` | Read and approve the diagnosis and proposed fix. |
| Standard | A feature with clear requirements | `scout → plan → cook --interactive → test → code-review` | Approve the plan before implementation. |
| Advanced | Architecture, contracts, migrations, or releases | `scout → brainstorm → advise → plan --deep → cook → review-pr → ship --dry-run` | Make the key decisions; approve plan and external side effects. |

When uncertain, choose the more deliberate workflow. A short scouting and planning pass is usually cheaper than correcting a change with the wrong scope.

## Core skills: tags, syntax, and flags

Let the agent select a skill from a natural-language request, or call one explicitly as `/kit:<tag> <goal> [flags]`. Flags change how a workflow operates; the safe default is the complete, interactive path.

| Core skill | Purpose and syntax | Basic flags and when to use them |
| --- | --- | --- |
| `kit:scout` | Locate relevant code, conventions, dependencies, and constraints: `/kit:scout <scope>` | `ext` enables opt-in external Gemini CLI scouting. It can send context outside the project, so use it only with approval. |
| `kit:brainstorm` | Compare options before a decision: `/kit:brainstorm <problem>` | No shortcut flag: this workflow intentionally stops for design approval. |
| `kit:plan` | Produce an implementation plan: `/kit:plan <task> [flags]` | `--fast` for familiar scope; `--deep` or `--hard` for risky decisions; `--parallel` for independent phases; `--tdd` for tests-first. Use `red-team` or `validate` to challenge a finished plan. |
| `kit:cook` | Implement a known scope or approved plan: `/kit:cook <task-or-plan> [flags]` | `--interactive` is the default. `--fast` skips research but still plans; `--parallel` delegates independent work; `--tdd` writes tests first. `--auto` removes approval pauses and `--no-test` weakens verification. |
| `kit:fix` | Diagnose a bug from the root cause: `/kit:fix <issue> [flags]` | `--review` asks for approval at key points; `--quick` fits a clearly isolated bug; `--parallel` fits multiple independent issues. `--auto` is the default. |
| `kit:test` | Run or design validation: `/kit:test <scope>` or `/kit:test ui <url>` | State the target—unit, integration, e2e, or UI—to avoid an unnecessarily broad run. |
| `kit:code-review` | Review local changes, a commit, PR, or codebase: `/kit:code-review --pending`, `#<PR>`, `<commit>`, or `codebase [parallel]` | Prefer the smallest stable scope. `--pending` is for the current local diff. |
| `kit:review-pr` | Review a GitHub pull request: `/kit:review-pr <number-or-url> [--fix] [--reply]` | `--fix` edits the workspace; `--reply` posts the review to GitHub. Both need explicit approval. |
| `kit:advise` | Get a critical second opinion before commitment: `/kit:advise <proposal> [--html|--md|--agent]` | `--html`/`--md` creates a shareable artifact; `--agent` invokes the advisor agent. |
| `kit:worktree` | Isolate parallel feature work: `/kit:worktree <feature-description>` | No essential flag; use it before parallel implementation to keep changes separate. |
| `kit:ship` | Prepare a completed branch for delivery: `/kit:ship [official|beta] [flags]` | Start with `--dry-run`. `--skip-tests`, `--skip-review`, and other `--skip-*` flags reduce safeguards and should not be used for an official release. |

Example:

```text
/kit:plan "Split billing into its own module" --deep --tdd
/kit:cook plans/<plan>/plan.md --interactive --tdd
/kit:code-review --pending
/kit:ship official --dry-run
```

## Workflow examples

### 1. Small bug

`scout → fix --review → test → code-review`

```text
/kit:fix "POST /users returns 500 when email is missing" --review
Reproduce the failure, identify the root cause, propose the smallest fix, add a regression test, and ask before editing.
```

Do not skip scouting or regression testing simply because the symptom is small.

### 2. Feature with alternatives

`scout → brainstorm → plan → cook --tdd → test → review-pr`

```text
/kit:brainstorm "Add OAuth to the current application"
First inspect the existing authentication flow. Compare two or three options with trade-offs. After I approve one, create a phased plan; then implement it tests-first and review the PR diff.
```

Brainstorming intentionally stops at a decision. Planning records the approved approach; cooking executes it.

### 3. Large refactor or migration

`scout → brainstorm → advise → plan --deep → worktree → cook --parallel → test → code-review → ship --dry-run`

```text
Assess splitting authentication from the monolith. Propose a migration with rollback,
ask advisor to challenge contract risks, and create a deep phased plan. Do not implement
until I approve it. Isolate parallel work in a worktree and dry-run shipping at the end.
```

Require a rollback path, explicit contract compatibility, and integration tests before release.

### 4. Architecture decision without implementation

`scout → brainstorm → advise → plan`

```text
Inspect the current session model and propose a new architecture. Compare two or three
options, have advisor challenge the recommendation, and produce a small validation plan.
Do not write code until I approve the architecture.
```

This workflow ends intentionally at a decision and plan.

## Approval and safety checkpoints

Ask the agent to stop and summarize the expected change, risk, rollback, and verification command before it:

- changes a migration, schema, or production data;
- uses an external service or external scouting;
- posts a GitHub review, pushes, merges, deploys, or publishes;
- disables a hook or bypasses testing/review safeguards.
