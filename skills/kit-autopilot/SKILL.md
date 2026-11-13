---
name: kit:autopilot
description: "Run one request end to end in the current repo (scout, plan, implement or fix, test, review, commit), picking the right kit skill for each phase while holding a strict token budget: cache-stable prompt prefix, lazy skill loading, and a measured cache-hit and context gate at every phase boundary. Use when the user says do it all, run the full workflow, autopilot, or work continuously without asking."
user-invocable: true
when_to_use: "Invoke when the user wants a request carried from understanding to a committed, verified change in the local repo with no hand-holding, and cares about token cost. Use /kit:vibe instead when the source is a GitHub issue and the goal is a reviewed PR or merge."
category: dev-tools
keywords: [autopilot, pipeline, end-to-end, workflow, orchestrate, token, cache, budget, autonomous]
argument-hint: "[--budget lean|normal] [--no-commit] <request or plan path>"
license: MIT
metadata:
  author: kit
  version: "1.0.0"
---

# Autopilot

One request in, one verified commit out. Autopilot is a router plus a budget:
it decides which kit skill owns each phase, loads only that skill, and checks
real token usage before moving on. It never bypasses a loaded skill's own
gates, tests or approval rules.

## Phase 0: Intake (no skill loads yet)

Classify once, write the result in one line, and do not re-classify later:

| Signal in the request | Route | Phase skills |
| --- | --- | --- |
| broken, error, failing, regression, CI red | **fix** | scout (only if location unknown) → `/kit:fix` → `/kit:test` |
| new capability, enhance, refactor, multi-file | **build** | `/kit:plan` → `/kit:cook` → `/kit:test` |
| one or two files, obvious change | **quick** | `/kit:cook --fast` → `/kit:test` |
| visual or UI quality is the point | **ui** | `/kit:frontend-design` (it plans itself) → browser check |
| existing `plans/**/plan.md` given | **execute** | `/kit:cook <plan>` → `/kit:test` |

Then always: `/kit:code-review` (self-review of the diff) → `/kit:git` commit,
unless `--no-commit`. Add a domain skill only when the phase hits its domain
(databases, better-auth, payment, deploy); see `rules/skill-domain-routing.md`.

Ask the user only when two readings lead to different code. Otherwise state
the assumption and continue.

## Token discipline (applies to every phase)

Prompt caching pays only while the prefix stays byte-identical. Every rule
below protects that prefix or keeps new tokens small.

1. **Load each skill once.** Its body stays in context; never re-invoke a
   skill to "refresh" it. Read a skill's `references/*` only when the phase
   needs that exact reference.
2. **Read narrowly, once.** Use `grep -n` and `sed -n a,bp` for the slice you
   need. Never re-read a file you just wrote or already have in context; the
   harness tracks edits. Pipe long command output through `tail`/`grep`.
3. **Delegate wide reads.** A search touching more than ~10 files goes to one
   Explore/scout subagent that returns a summary, so the raw files never
   enter the main context.
4. **Append, never rewrite history.** Do not edit plans or files earlier in
   the conversation just to restate them; append decisions instead.
5. **Batch independent tool calls** in one message; each round trip re-sends
   the whole prefix.
6. **Terse internal output.** Reports and phase notes are bullet fragments.
   Full prose only in the final user-facing summary.
7. **Compact at phase boundaries, not mid-edit**, when the gate below says the
   context is heavy.

## Budget gate (run at every phase boundary)

Record the start timestamp of the run, then after each phase:

```bash
node "$SKILL_DIR/scripts/token-audit.cjs" --since <run-start-ISO> --min-hit 0.8 --max-context 0.7
```

`SKILL_DIR` is this skill's directory. Exit code 2 means a gate failed:

| Gate | Threshold (`--budget normal`) | `lean` | Action on fail |
| --- | --- | --- | --- |
| cache hit ratio | ≥ 0.80 | ≥ 0.90 | Stop re-reading and re-loading; check rules 1, 2 and 4 |
| peak context | ≤ 70% of window | ≤ 50% | Delegate the next wide read; compact before the next phase |
| avg new tokens / turn | report only | ≤ 4k | Narrow reads, trim command output |

A failed gate is fixed before the next phase starts, never ignored. The
script reads only usage numbers from the transcript, never message text.

## Phases

1. **Understand**: route from Phase 0. Scout only when the touched files are
   not already known.
2. **Plan**: `build` route only. Plan under `plans/<timestamp>-<slug>/`; keep
   `plan.md` short. Skip for fix/quick.
3. **Implement**: the routed skill. Prove a bug's cause before changing
   behavior.
4. **Verify**: narrowest test first, then typecheck/build/integration when a
   shared contract changed. UI work is checked in a browser at desktop and
   375px. Never weaken a test to pass.
5. **Review**: `/kit:code-review` on the diff; fix blockers, record the rest.
6. **Commit**: `/kit:git` with focused conventional commits. No push unless
   asked.

## Final report

End with one table and nothing else verbose:

| Phase | Skill | Result | New tokens | Cache hit |
| --- | --- | --- | --- | --- |

Fill the token columns from the gate runs. After the table, list what was not
verified and any open question.
