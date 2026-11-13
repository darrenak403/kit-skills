# Output Naming Convention

Hooks inject a `## Naming` section into context with the computed output paths for the current invocation (report path, plan directory, date-stamped slug, etc.). Skills that write files MUST use these injected paths instead of inventing their own.

## What gets injected

- **`Report:`** — the full path (including computed date and descriptive slug) where a report-type output should be saved.
- **`Plan dir:`** — the dated plan directory (`plans/{date}-{issue}-{slug}/`) to use for plan files, or to create if none is active.
- Other invocation-specific paths follow the same pattern: hook-computed, full path, ready to use verbatim.

## How to use it

1. Read the `## Naming` section from injected context (not from your own guess at a filename).
2. Use the relevant path (`Report:`, `Plan dir:`, etc.) verbatim as the output location.
3. Invoke `kit:project-organization` to organize outputs that don't map to a single injected path.

## Missing-`## Naming` Fallback

If the `## Naming` section is not present in context (e.g. hook didn't fire, or the skill is invoked in a context without it), do NOT guess a path or default to an arbitrary location. Ask the main agent / user to provide the output path explicitly before writing anything.

## Consumer Deltas

- **kit-research**: applies the fallback verbatim — "If `## Naming` section is not available, ask main agent to provide the output path."
- **kit-plan**: also reads `## Plan Context` (a related but distinct hook-injected block) to decide whether to resume an active plan, branch from a suggestion, or create new via `Plan dir:` from `## Naming`.
- **kit-advise / kit-test / kit-brainstorm / kit-bootstrap / kit-show-off / kit-frontend-design**: use the `Report:` (or equivalent) path with a descriptive filename/type suffix appropriate to that skill's output (e.g. `advise`, `-state.md` suffix for kit-advise's loop state file).
