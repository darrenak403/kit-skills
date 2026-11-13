---
name: kit:autopilot
description: "The single end-to-end pipeline: takes a request or GitHub issue through scout, plan, implement or fix, test, review and commit, and in PR mode on to a reviewed PR, merge and green CI. Picks the owning kit skill per phase, decides with a cost calculator whether work runs inline or in subagents and how many, and enforces a measured token budget (cache hit, peak context, subagent share) at every phase boundary. Use for do it all, full workflow, autopilot, work continuously, ship this issue."
user-invocable: true
when_to_use: "Invoke when the user wants a request or GitHub issue carried from understanding to a committed, verified change (or a reviewed PR with --pr, merged with --ship) without hand-holding, at the lowest token cost."
category: dev-tools
keywords: [autopilot, pipeline, end-to-end, workflow, orchestrate, subagent, delegation, token, cache, budget, autonomous, vibe, pr, ship]
argument-hint: "[--pr] [--ship] [--beta] [--budget lean|normal] [--no-commit] <request | plan path | github-issue-url>"
license: MIT
metadata:
  author: kit
  version: "2.1.0"
---

# Autopilot

One request in, one verified commit out. Autopilot is a router plus a budget:
it decides which kit skill owns each phase, loads only that skill, and checks
real token usage before moving on. It never bypasses a loaded skill's own
gates, tests or approval rules.

## Phase 0: Intake (no skill loads yet)

Classify once, write the result in one line, and do not re-classify later.
Check the rows top to bottom; the first match wins.

| Signal in the request | Route | Phase skills |
| --- | --- | --- |
| a question: why, how does, where is, explain; no change asked | **ask** | `/kit:scout` (or direct reads under ~20k) → answer with file:line evidence. Stop: no plan, no edits, no commit |
| GitHub issue URL/number, or `--pr` / `--ship` / `--beta` | **pr** | read `references/pr-mode.md` and follow it: worktree, plan gates, implement, PR, review, optional merge and CI |
| PR checks red, CI failing on a branch | **ci** | `/kit:fix --auto` on the failing job's log → re-run that job's command locally → push only if asked |
| redo, fix again, still wrong, revert part of earlier work (a commit, plan or "what you did") | **rework** | see *Rework* below → `/kit:fix` or `/kit:cook --fast` on the delta only → `/kit:test` scoped to the touched files |
| broken, error, failing, regression | **fix** | scout (only if location unknown) → `/kit:fix` → `/kit:test` |
| existing `plans/**/plan.md` given | **execute** | `/kit:cook <plan>` → `/kit:test` |
| visual or UI quality is the point | **ui** | `/kit:frontend-design` (it plans itself) → browser check |
| security audit, vulnerability, secrets | **security** | `/kit:security` (audit, then guarded fix) → `/kit:test` |
| docs, README, architecture notes only | **docs** | `/kit:docs` → link and claim check. No code review phase |
| deploy, release to an environment | **deploy** | `/kit:test` first → `/kit:deploy`. The deploy step itself asks the user |
| one or two files, obvious change | **quick** | `/kit:cook --fast` → `/kit:test` |
| new capability, enhance, refactor, multi-file | **build** | `/kit:plan` → `/kit:cook` → `/kit:test` |

Then, for every route that changed code: review at the depth the *Risk tier*
sets → `/kit:git` commit, unless `--no-commit`. Add a domain skill only when a
phase hits its domain (databases, better-auth, payment); see
`rules/skill-domain-routing.md`.

### Rework (earlier work needs changing)

The earlier work already says where to look, so never scout from scratch:

1. Find the anchor: the commit(s) named or the latest ones touching the topic
   (`git log --oneline -n 10 -- <path>` or `git log -S`), or the plan file.
2. Read only that diff (`git show --stat`, then the hunks you need), plus the
   user's statement of what is wrong. This is usually under 10k tokens.
3. Write one line: expected vs actual. Change only the delta; keep the parts
   that were right.
4. Re-run the tests that covered the original change plus one that proves the
   new expectation. A rework that breaks the earlier intent is a regression.

### Risk tier (sets review depth, not route)

| Tier | When | Review |
| --- | --- | --- |
| low | docs, copy, styles, tests only, ≤ 2 files | self-review of the diff, no subagent |
| normal | default | `/kit:code-review` on the diff |
| high | auth, payments, data migration, security, public API or schema, deletes data, > 10 files | `/kit:code-review` in a fresh `code-reviewer` subagent (independent eyes are worth its ~25k start), plus the full test suite, not only the narrow one |

State the tier in the intake line, e.g. `route: rework · tier: high · budget: normal`.

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

## Delegation gate (inline or subagents, and how many)

Splitting work never lowers the total token count: every subagent pays a
cold start (~25k of system prompt, tools, rules and brief) and re-reads what
the main thread already knows. What it saves is the **main context**: every
token read inline is re-sent as cache on every later main turn. So delegate
only when the read is large, the result is small, and the main thread still
has many turns ahead.

Before any read-heavy step (wide search, many files, long logs), estimate and run:

```bash
node "$SKILL_DIR/scripts/delegation-calc.cjs" --read <tokens> --parts <independent pieces> --turns <main turns left>
```

| Input | How to estimate |
| --- | --- |
| `--read` | files × ~2k tokens (or bytes / 4); search or log output size |
| `--parts` | pieces that touch different files and need no result from each other |
| `--turns` | phases left × ~10 turns |
| flags | `--needs-context` if the piece depends on this conversation, `--writes-shared` if pieces edit the same files, `--prefer-speed` to parallelize when it costs ≤ 35% more |

It prints inline vs N subagents with both costs. Hard rules it encodes:
- Inline when reading under ~20k, when the piece needs this conversation, when
  parallel pieces would edit the same files, or when the main thread ends soon.
- One subagent by default; more only when a slice would exceed ~120k (one
  agent's comfortable window) or for speed at bounded cost. Never more than 4.
- Read-only subagents run on a cheaper model; code-writing ones on the same model.
- Briefs are self-contained (exact paths, acceptance, no conversation history),
  share the same opening text so their prefixes cache together, and demand a
  reply of at most ~1.5k tokens: `Status / Summary / Files / Open questions`.

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
| subagent share of cost | report only | ≤ 40% | Fewer or smaller subagents; re-run the calculator with real numbers |

A failed gate is fixed before the next phase starts, never ignored. The
script also sums each subagent transcript of the session, so the cost of
delegation is measured, not assumed. It reads only usage numbers, never
message text.

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

| Phase | Skill | Inline / subagents | Result | New tokens | Cache hit |
| --- | --- | --- | --- | --- | --- |

Fill the token columns from the gate runs. After the table, list what was not
verified and any open question.
