# External Scouting with Gemini

Use the Gemini CLI for faster searches with a large context window (1M+ tokens) when the user has explicitly opted in. This path is **consent-gated and off by default** — the larger-scale external CLI tier that used to sit above Gemini here has been removed entirely (redundant with internal Explore agents; use `internal-scouting.md` for anything above the Gemini tier).

## Consent Gate, Configuration, Error Handling

Shared doctrine (toggle, model config, validation check, command wrapper, error markers, no-retry/warn-once rules): `../../_shared/gemini-fallback.md`.

Delta: toggle is `skills.scout.useGemini`; additionally gated by SCALE — `useGemini==true` only applies at SCALE <= 3, SCALE >= 4 always uses internal scouting regardless of the toggle; real-query timeout 120s; falls back to internal Explore-agent scouting (`internal-scouting.md`).

```
useGemini == false        → Use internal scouting instead (default)
useGemini == true, SCALE <= 3 → gemini CLI
useGemini == true, SCALE >= 4 → Use internal scouting instead
```

### Example
```bash
timeout 120 gemini -y -m gemini-3-flash-preview --prompt "Search src/ for authentication files. List paths with brief descriptions." 2>&1
```

## Parallel External Commands

Prefer direct `run_shell` commands for Gemini probes. Use delegated
workers only when the user explicitly requested parallel delegation and the
runtime exposes a suitable delegate_agent role.

```bash
timeout 120 gemini -y -m gemini-3-flash-preview --prompt '[prompt1]' 2>&1
timeout 120 gemini -y -m gemini-3-flash-preview --prompt '[prompt2]' 2>&1
timeout 120 gemini -y -m gemini-3-flash-preview --prompt '[prompt3]' 2>&1
```

When delegation is permitted, split those commands across workers with
non-overlapping prompts.

## Prompt Guidelines

- Be specific about directories to search
- Request file paths with descriptions
- Set clear scope boundaries
- Ask for patterns/relationships if relevant

## Example Workflow

User: "Find database migration files"

Run scoped probes:
```bash
timeout 120 gemini -y -m gemini-3-flash-preview --prompt 'Search db/, migrations/ for migration files' 2>&1
timeout 120 gemini -y -m gemini-3-flash-preview --prompt 'Search lib/, src/ for database schema files' 2>&1
timeout 120 gemini -y -m gemini-3-flash-preview --prompt 'Search config/ for database configuration' 2>&1
```

## Reading File Content

Chunking procedure (identical for internal and external scouting): `chunking.md`.

## Timeout and Error Handling

Command wrapper, error markers, no-retry/warn-once/model-fallback rules: `../../_shared/gemini-fallback.md` (delta: on persistent failures across 2+ agents, fall back to internal scouting for the rest of the operation).
