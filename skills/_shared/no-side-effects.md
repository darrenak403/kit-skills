# HARD-GATE-NO-SIDE-EFFECTS (canonical pattern)

Work is NOT done until verified to be side-effect-free. The review/verification gate MUST prove all 5 obligations below (evidence-before-claims discipline: see `verification-before-completion.md`):

1. New/fixed behavior matches every acceptance criterion (or: original symptom no longer reproduces — re-run the exact pre-fix repro).
2. All tests pass — including tests in modules that share files/contracts with the change (the full **blast radius**, not just the modified file).
3. No existing business logic / workflow regression: explicitly walk each touchpoint and any caller of changed functions.
4. No new lint/type/build errors anywhere in the repo.
5. Public contracts unchanged unless intentional and called out — function signatures, exported types, API responses, DB schemas, env vars, config keys.

## Escalation on failure

If verification reveals a side effect, regression, or broken workflow, STOP. Do NOT silently patch around it. Use `ask_user capability` to present:

- What broke (file, test, workflow, user-facing behavior)
- Why it happened (1-line cause)
- 2-4 concrete options, e.g.:
  - "Revert and try a different approach / narrower scope"
  - "Keep the change and update the dependent code to match the new contract"
  - "Narrow the change's scope so the regression goes away"
  - "Accept the regression — it was buggy/unintended behavior being locked in"

Let the user decide. Never silently patch or assume.

## Consumer deltas

- **kit-cook**: if the user invoked `--no-test`, item 2 is downgraded to a warning (surfaced at finalize `ask_user capability`, not silently skipped). Items 1, 3, 4, 5 remain enforceable via the mandatory `code-reviewer` subagent.
- **kit-fix**: item 1 is framed as "original symptom no longer reproduces"; item 3's blast radius comes from the diagnosis step's root-cause investigation.
