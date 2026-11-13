# HARD-GATE-EXACT-REQUIREMENTS (canonical pattern)

Before proposing approaches or producing a plan, you MUST be able to answer ALL five items below in one concrete sentence each. Use `ask_user capability` to pin down anything vague — never proceed on hand-wavy answers like "make it better", "add some validation", "improve UX".

1. **Expected output**: the concrete artifact(s) the user will see at the end (file paths, feature behavior, UI screen, API endpoint + payload, CLI command + flags) — be concrete enough to verify it later.
2. **Acceptance criteria**: specific behaviors / inputs → outputs / edge cases that MUST work to call it "done".
3. **Scope boundary**: what is explicitly OUT of scope this round.
4. **Non-negotiable constraints**: tech stack, file locations, naming, backward compatibility, deadlines, performance.
5. **Touchpoints**: which existing files/modules (from scout) this will interact with, modify, or extend; which contracts must stay stable.

Ground every `ask_user capability` option in what scout found (e.g., "Add to `src/api/users.ts` (matches existing pattern) or new `src/api/profile.ts`?") — never ask abstract questions when the codebase already constrains the answer.

If any item is still vague after one round of questions, ask another round. Push for concrete examples, sample inputs/outputs, or a reference to mimic.

## Consumer deltas

- **kit-cook**: skip this gate entirely when the input is a `plan.md`/`phase-*.md` path — the plan already encodes these answers.
- **kit-brainstorm**: applied during the Discovery Phase; loop until all 5 items are concrete before moving to Scope Assessment.
