# Full Interactive Workflow (`--full`)

**Thinking level:** Ultrathink
**User gates:** Every major phase requires user approval before proceeding.

## Step 1: Clarify Requirements

Use `ask_user capability` to probe user's request, constraints, true objectives.
- Ask 1 question at a time, wait for answer before next
- Question everything — don't assume
- Challenge assumptions — best solution often differs from initial vision
- Continue until 100% certain about requirements

## Step 2: Research

Spawn multiple `researcher` subagents in parallel:
- Explore request validity, challenges, best solutions
- Keep every report ≤150 lines

**Gate:** Present findings to user. Proceed only with approval.

## Step 3: Tech Stack

1. Ask user for preferred tech stack. If provided, skip to step 4.
2. Use `planner` + multiple `researcher` subagents in parallel to find best-fit stack
3. Present 2-3 options with pros/cons via `ask_user capability`
4. Write approved tech stack to `./docs` directory

**Gate:** User approves tech stack before continuing.

## Step 4: Wireframe & Design

1. Ask user if they want wireframes/design. If no → skip to Step 5.
2. Use `ui-ux-designer` + `researcher` subagents in parallel:
   - Research style, trends, fonts (predict Google Fonts name, NOT just Inter/Poppins), colors, spacing, positions
   - Describe assets for `kit:codex` skill generation
3. `ui-ux-designer` creates:
   - Design guidelines at `./docs/design-guidelines.md`
   - Wireframes in HTML at `./docs/wireframe/`
4. If no logo provided: generate with `kit:codex` skill
5. Screenshot wireframes with `kit:agent-browser` -> save to `./docs/wireframes/`

**Gate:** User approves design. Repeat if rejected.

**Image tools:** `kit:codex` for generation, native `Read` tool for analysis, `imagemagick` for crop/resize, background removal tool as needed.

## Step 5: Planning

Activate **kit:plan** skill: `/kit:plan --hard <requirements>`
- Planner creates directory using `## Naming` pattern (see `../../_shared/output-naming.md`)
- Overview at `plan.md` (<80 lines) + `phase-XX-*.md` files
- Present pros/cons of plan

**Gate:** User approves plan. DO NOT start implementing without approval.

## Step 6: Implementation → Final Report

Load `references/shared-phases.md` for remaining phases.

Activate **kit:cook** skill: `/kit:cook <plan-path>` (interactive mode — review gates at each step)
