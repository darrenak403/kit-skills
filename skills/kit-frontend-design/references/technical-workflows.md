# Complete Workflow Examples

End-to-end pipeline examples for asset generation and analysis. Generation routes through the `kit-codex` skill (`gpt-image-2` — see `skills/kit-codex/references/image-generation.md`); analysis and extraction use Claude's native `Read` tool directly on the image file.

## Example 1: Hero Section (Complete Pipeline)

1. **Generate hero image with design context** via `kit-codex`:
   ```
   Use $imagegen skill. Minimalist desert landscape, warm beige sand dunes,
   soft morning light, serene and spacious, muted earth tones
   (tan, cream, soft ochre), clean composition for text overlay,
   sophisticated travel aesthetic, 16:9 cinematic.
   ```
   Save to `docs/assets/hero-desert.png`.

2. **Evaluate aesthetic quality**: `Read` `docs/assets/hero-desert.png`, then rate 1-10 for visual appeal, color harmony, suitability for overlaying white text, and professional quality. List any improvements needed. Write findings to `docs/assets/hero-evaluation.md`.

3. **If score â‰¥ 7/10, optimize for web**: use the `kit-media-processing` skill to convert `docs/assets/hero-desert.png` to `docs/assets/hero-desktop.webp` at quality 85.

4. **Generate mobile variant (9:16)** via `kit-codex` with the same prompt, aspect ratio swapped to 9:16 portrait. Save to `docs/assets/hero-mobile.png`.

5. **Optimize mobile variant**: use `kit-media-processing` to convert to `docs/assets/hero-mobile.webp` at quality 85.

## Example 2: Extract, Generate, Analyze Loop

1. **Extract design guidelines from inspiration**: `Read` `docs/inspiration/competitor-hero.png`, then work through the extraction prompt from `extraction-prompts.md`. Write findings to `docs/design-guidelines/competitor-analysis.md`.

2. **Generate asset based on extracted guidelines** (review `competitor-analysis.md` for color palette, aesthetic) via `kit-codex`. Save to `docs/assets/our-hero.png`.

3. **Analyze our generated asset**: `Read` `docs/assets/our-hero.png` and `docs/inspiration/competitor-hero.png`, compare, and rate differentiation 1-10 â€” too similar or successfully distinct? Write to `docs/assets/differentiation-analysis.md`.

4. **Extract colors from our final asset for CSS**: `Read` `docs/assets/our-hero.png` and apply the color extraction approach from `visual-analysis-overview.md`. Write to `docs/assets/color-palette.md`.

## Example 3: A/B Test Assets

1. **Generate 2 design directions** via `kit-codex`:
   - Variant A: "Minimalist approach: [prompt]" â†’ `docs/assets/variant-a.png`
   - Variant B: "Bold approach: [prompt]" â†’ `docs/assets/variant-b.png`

2. **Compare variants**: `Read` both `docs/assets/variant-a.png` and `docs/assets/variant-b.png`, then evaluate for [target audience]:
   1. Attention capture
   2. Brand alignment
   3. Conversion potential

   Recommend which to test. Write to `docs/assets/ab-comparison.md`.

3. **Generate production version of winner** via `kit-codex` with the winning approach's prompt. Save to `docs/assets/final-hero.png`.

## Batch Analysis for Rapid Iteration

1. Generate 3 variations via `kit-codex`, each with a variation-specific twist on the same base prompt: `docs/assets/var-1.png`, `docs/assets/var-2.png`, `docs/assets/var-3.png`.
2. `Read` each of the three images, rank them 1-3 with scores, and identify the winner. Write to `docs/assets/batch-analysis.md`.
