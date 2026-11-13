---
name: kit:codex
description: "Use OpenAI Codex CLI (GPT-5.5 + gpt-image-2): second-opinion code review, GitHub PR audit, plan/spec auditing, edge-case discovery, style/persona prompting, and subscription-billed image generation for visual assets, banners, infographics. Activate on 'codex', 'second opinion', 'audit plan', 'review PR with codex', 'generate image', or 'create banner/illustration/visual asset'."
when_to_use: "Invoke when the user wants a Codex CLI second opinion on code/PR/plan, wants an adversarial review pass distinct from Claude's own, or wants gpt-image-2 image generation for visual assets, banners, or infographics."
license: MIT
user-invocable: true
category: dev-tools
keywords: [codex, gpt-image-2, second-opinion, code-review, plan-audit, image-generation]
argument-hint: "[review-pr|audit-plan|gen-image|exec|role-play] [target]"
metadata:
  author: kit-skills
  version: "1.0.0"
---

# Codex CLI Skill

Use the `codex` CLI (OpenAI GPT-5.5 for text/code + `gpt-image-2` for image generation) as a complementary tool to Claude. Codex's strengths are **careful file reading**, **edge-case spotting**, **role-play fidelity**, and **unlimited high-quality image generation** under subscription auth.

## When To Use Codex (Decision Tree)

```
User intent
├── "Review/audit my code/PR/diff"        → Codex review  (see references/code-review-workflows.md)
├── "Audit/review my plan or spec"        → Codex plan audit (see references/plan-audit-workflows.md)
├── "Generate an image/banner/illustration/icon/infographic/visual asset" → Codex image gen (see references/image-generation.md)
├── "Get a second opinion from Codex"     → Codex exec one-shot
├── "Pretend to be Gemini/Qwen/o3"        → Codex role-play (see references/best-practices.md)
└── "Just run codex on X programmatically" → Codex exec (see references/cli-reference.md)
```

**Do NOT** use Codex when:

- The task is small, mechanical, or fully solvable by Claude in the current session (waste of latency/credits).
- The user wants a final implementation pushed to disk by Codex — prefer Claude for in-session edits, use Codex for _analysis only_ unless explicitly asked.
- Sensitive data is in the working dir without user clearance (Codex sends content to OpenAI).

## Related Skills

See `../kit-find-skills/references/domain-routing.md` for the full code/PR-review disambiguation. `kit:code-review` is the primary/default adversarial review path (pending changes, PR, commit, or codebase scan); Codex is a second opinion to run after or alongside it, not a replacement for it. The built-in `/review` command fetches and reviews a GitHub PR directly — use `kit:code-review --pending` for a working diff instead.

## Why Codex Beats Claude For Certain Tasks

| Task                    | Why Codex                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan/spec audit         | Codex (GPT-5.5) reads files carefully — catches edge cases Opus skims. Uses ~4× fewer tokens than Claude on equivalent work                                                                                                                                                                                                                                                                                                                                              |
| PR review               | Independent reader, fresh context, no shared bias with the implementing Claude session. Native GitHub integration via `@codex review`                                                                                                                                                                                                                                                                                                                                    |
| Image generation        | `gpt-image-2` ([announced Oct 2025](https://community.openai.com/t/introducing-gpt-image-2-available-today-in-the-api-and-codex/1379479)) via subscription counts toward limits but no per-image dollar charge; iterate fast in terminal. Field reports prefer it over Gemini Nano Banana Pro for mockups/decorations/banners. Invoke via bundled `$imagegen` skill. **Native transparency NOT supported — uses official chroma-key workflow** (see image-generation.md) |
| Style/persona prompting | Persona instructions in AGENTS.md or one-off prompts shift Codex's voice/verbosity reliably. Cross-model mimicry (Codex behaving as Gemini/Qwen/o3) is community-reported but unverified — use for prompt iteration only, not production routing                                                                                                                                                                                                                         |

## Core Invocation Patterns

All Codex calls are **non-interactive** (`codex exec` or `codex review`). NEVER call bare `codex` in a script — it opens the TUI.

### Pattern 1: One-shot prompt

```bash
codex exec -C "$PWD" --skip-git-repo-check </dev/null \
  "Audit ./plans/foo.md for missing edge cases"
```

### Pattern 2: Full-auto write (convenience for automation)

```bash
codex exec --full-auto -C "$PWD" </dev/null "Generate hero.png in ./assets"
# --full-auto == --sandbox workspace-write + --approval-policy on-failure
```

### Pattern 3: Code review against branch

```bash
codex review --base main "Focus on auth and data-loss risks"
```

### Pattern 4: Capture last message only (for piping into Claude)

```bash
codex exec -o /tmp/codex-out.md "Review this diff" -C "$PWD"
```

### Pattern 5: JSON event stream (programmatic parsing)

```bash
codex exec --json "..." | jq -r 'select(.type=="agent_message") | .message'
```

## Critical Defaults & Avoidances

- **Always pass `-C "$PWD"`** when invoking from a script so Codex roots at the right project, not `~/.codex`. Pass `--skip-git-repo-check` when CWD is not a git repo.
- **Redirect stdin** (`</dev/null`) in non-interactive scripts — without it, Codex hangs reading stdin.
- **Default sandbox is good** (`workspace-write`). Use `read-only` for pure review/audit. Use `danger-full-access` ONLY when the user explicitly authorizes it. NEVER use `--dangerously-bypass-approvals-and-sandbox` unless the parent process is already externally sandboxed and the user asked for it.
- **Prefer `$imagegen` skill invocation for images** — `scripts/codex-generate-image.sh` auto-prepends the literal token, which loads Codex's bundled imagegen skill (correct model routing, save-path policy, transparency flow). See `references/image-generation.md` for the full chroma-key transparency workflow, output-path handling, and pixel-dimension caveats.
- **Don't double-instruct**: Codex respects `AGENTS.md` cascading from project root → CWD. Don't repeat global rules in the prompt.
- **Watch the dual-window rate limit** (subscription): 5-hour window AND weekly window both must have budget. Check via `/status`.

Known CLI flag quirks (approval-policy config reverting, stdin-piping limits, session
persistence) and platform sandbox gotchas (Windows, macOS, Linux) are cataloged in
`references/best-practices.md` — read it before scripting anything beyond the patterns above.

## Workflows

| Task                                                                      | Script                                                 | Reference                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| Review a GitHub PR with Codex                                             | `scripts/codex-review-pr.sh <pr-number>`               | `references/code-review-workflows.md` |
| Audit a plan file                                                         | `scripts/codex-audit-plan.sh <plan-path>`              | `references/plan-audit-workflows.md`  |
| Generate + relocate image (auto-prepends `$imagegen`)                     | `scripts/codex-generate-image.sh "<prompt>" [out-dir]` | `references/image-generation.md`      |
| Strip chroma-key → transparent PNG (uses upstream `remove_chroma_key.py`) | `scripts/codex-strip-chroma-key.sh <in.png> <out.png>` | `references/image-generation.md`      |
| Persona prompting (style/tone only)                                       | inline `codex exec` with persona prompt                | `references/best-practices.md`        |
| All CLI flags                                                             | —                                                      | `references/cli-reference.md`         |

`scripts/tests/run-all.sh` runs sandboxed tests for all 4 scripts above (throwaway temp repos/dirs, fake `gh`/`codex` executables — never the real repo or a live Codex call).

## Output Handling

After every Codex call:

1. **Read the output** — never assume Codex succeeded silently.
2. **Surface findings to user verbatim** when Codex audits something; do not summarize away edge cases (that defeats the point of asking Codex).
3. **If Codex generated images**, run the post-move logic in `scripts/codex-generate-image.sh` or manually:
   ```bash
   latest_session=$(ls -t ~/.codex/generated_images/ | head -1)
   mv ~/.codex/generated_images/"$latest_session"/* ./assets/ && rm -rf ~/.codex/generated_images/"$latest_session"
   ```
4. **Cite findings** with `file:line` when relaying Codex's review back to user.

## Security Policy

This skill handles: invoking `codex` CLI, parsing its stdout, moving generated images, optionally piping diffs/plans into Codex.

This skill does NOT handle: storing OpenAI API keys (uses existing `~/.codex/auth.json`), modifying Codex config, executing arbitrary user code outside `codex exec`.

Refuse to: bypass sandbox without explicit user authorization, send `.env` or credential files to Codex, run `codex exec` against directories the user didn't ask you to touch.

## Prerequisites & Environment

| Name | Purpose | Required? |
| --- | --- | --- |
| `codex` CLI installed | Provides the `codex` / `codex exec` commands this skill invokes | Required |
| Codex login (`~/.codex/auth.json`) | Authenticates CLI calls (OpenAI GPT-5.5 + `gpt-image-2`) | Required |

The kit ships no configuration-value file for this skill — no API key, no auth token. Users install and authenticate the `codex` CLI themselves (`codex login` or equivalent) through their own local setup; this skill only invokes the CLI once it is already configured.
