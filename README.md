# Kit Skills

[English](README.md) | [Tiếng Việt](README.vi.md)

> Maintained by ngothanhdat. Installed at user level (`~/.claude/`) so every
> repository shares one source of truth. Licensing: [NOTICE.md](NOTICE.md).

Kit Skills is a source-installed toolkit for **Claude Code** and **Codex**. It turns common engineering work into consistent, reviewable workflows: understand the codebase, decide, plan, implement, test, review, and ship.

The kit has one shared source of truth for skills, rules, agents, and policy. Its installer generates runtime-specific integration under `.claude/` and `.codex/`, so each runtime receives only the configuration it can use.

## Start here

1. Install the kit in the root of the target project.
2. Describe a goal, scope, acceptance criteria, and when the agent should stop for approval.
3. Use the core workflow: `scout → brainstorm → plan → cook → test → code-review → ship`.

Read the step-by-step onboarding and examples in the [English guide](GUIDE.md) or the [Vietnamese guide](GUIDE.vi.md).

## Install

Run the installer from the target project's root directory:

```powershell
irm https://raw.githubusercontent.com/darrenak403/kit-skills/main/install.ps1 | iex
```

The one-liner installs both runtimes. To install a single runtime:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/darrenak403/kit-skills/main/install.ps1))) --claude
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/darrenak403/kit-skills/main/install.ps1))) --codex
```

The installer replaces only the selected generated runtime directory, preserves an existing project-owned `.kit.json`, and does not alter the project `.gitignore`. Review [`install.ps1`](install.ps1) before executing remote code. For production, pin a reviewed version with `-Ref`.

## What the kit provides

- **Core skills:** scouting, brainstorming, planning, implementation, debugging, testing, code/PR review, worktree isolation, advisory, and shipping.
- **Specialist skills:** domain capabilities that core workflows select when relevant, rather than a separate workflow users must memorize.
- **Subagents:** focused planning, research, implementation, review, documentation, and delivery perspectives.
- **Runtime integrations:** separate generated adapters for Claude Code and Codex, sourced from the same shared policy.
- **Guard rails:** privacy, broad-scan, secret-output, session-state, development-rule, and simplify protections.

## Built for deliberate delivery

Kit Skills makes an agent session easier to audit and safer to hand off. It grounds work in the existing codebase, makes assumptions and trade-offs visible before implementation, keeps plans and verification close to the change, and preserves the human approval points that matter. The same workflow works whether the task is an isolated regression, a multi-phase feature, or a release from a reviewed branch.

## Configuration and safety

`.kit.json` is the project-owned configuration file. Its schema is [`schemas/kit-config.schema.json`](schemas/kit-config.schema.json). It controls language, plans, paths, simplify thresholds, and hook enablement.

The default hooks protect likely secret-file access, overly broad scans, secret disclosure in prompts, and attempts to ship a large unsimplified diff. They are configurable, but disabling a hook reduces protection. Kit Skills does not replace access control, CI, human review, secret management, or release approval.

Before actions that can alter remote state or production data—such as posting a GitHub review, push/merge/deploy, migration, or external-service use—ask the agent to stop and present the expected change, risk, rollback, and verification command.

## Documentation

| Document | English | Tiếng Việt |
| --- | --- | --- |
| Getting started and workflows | [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md) |
| Project configuration | [`.kit.json`](.kit.json) | [`.kit.json`](.kit.json) |
| Configuration schema | [schema](schemas/kit-config.schema.json) | [schema](schemas/kit-config.schema.json) |
| Skills reference | [`skills/`](skills/) | [`skills/`](skills/) |

## Scope

Kit Skills helps make engineering work more deliberate and repeatable. Review all changes before merging, keep secrets out of prompts and repositories, and adapt the kit to your organization's requirements.
