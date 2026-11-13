# Gemini CLI Fallback Pattern

Gemini CLI is kept as an optional, **consent-gated, off-by-default** acceleration path (large context window, fast search). Every consumer must gate on explicit opt-in and fail gracefully back to a native alternative (`web_search capability`, internal Explore agents, etc.) — never block a workflow on Gemini being available.

## Consent Gate

Read from `.kit.json` (or `~/.kit.json`): `skills.<skill-name>.useGemini` (default: `false`).

- If `false` or absent: **do not** invoke the `gemini` CLI. Use the skill's native fallback instead.
- If `true`: proceed with the Gemini CLI below, after validating it works.

## Model Configuration

Read from `.kit.json`: `gemini.model` (default: `gemini-3-flash-preview`).

```json
{
  "gemini": { "model": "gemini-3-flash-preview" }
}
```

## Installation / Validation Check

Before the first real call, validate the CLI works:

```bash
command -v gemini >/dev/null 2>&1 && cd /tmp && timeout 15 gemini -y -m <model> --prompt "ping" >/dev/null 2>&1
```

Run from a temp dir to avoid project `GEMINI.md` interception (note: the global `~/.gemini/GEMINI.md` still loads regardless). If validation fails or times out, fall back immediately and warn once: "Gemini CLI unavailable or auth failed, using \<fallback\>."

If the binary itself isn't installed, ask the user: (1) provide installation instructions (may need manual auth steps), or (2) fall back to the native alternative only when delegation/fallback is explicitly permitted.

## Command Wrapper Pattern

```bash
timeout <N> gemini -y -m <model> --prompt "[prompt]" 2>&1
```

`<N>` is call-specific (short for validation pings, longer for real queries — see consumer deltas). Always run from `/tmp` per the validation-check note above.

## Error Markers (no-retry list)

Check exit code — non-zero means failure. Also check output for these markers regardless of exit code:

```
GaxiosError
RESOURCE_EXHAUSTED
MODEL_CAPACITY_EXHAUSTED
PERMISSION_DENIED
UNAUTHENTICATED
```

## Exit-Code / No-Retry / Warn-Once Rules

- On any failure (non-zero exit OR an error marker present): fall back for that query/call. Do **NOT** retry the same Gemini call.
- Warn the user ONCE per session/invocation that Gemini failed and a fallback is being used — do not repeat the warning per call.
- On persistent failures across multiple parallel calls: stop trying Gemini for the remainder of the invocation and fall back entirely.
- **Model fallback**: if the configured model fails with a 429/`RESOURCE_EXHAUSTED`, try `gemini-2.5-flash` once before giving up on Gemini entirely.

## Consumer Deltas

- **kit-research**: toggle is `skills.research.useGemini`; validation timeout 15s, real-query timeout 180s; falls back to `web_search capability`; successful output is still saved via `Report:` path from `## Naming` (`../_shared/output-naming.md`), including all citations.
- **kit-scout**: toggle is `skills.scout.useGemini`; real-query timeout 120s; falls back to internal Explore-agent scouting (`internal-scouting.md`); additionally gated by SCALE (`useGemini==true` only applies at SCALE <= 3 — SCALE >= 4 always uses internal scouting regardless of the toggle).
