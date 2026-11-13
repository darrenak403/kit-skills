# Advanced Analysis Techniques

Advanced strategies for visual analysis and testing. Analysis uses Claude's native `Read` tool directly on the image file â€” this is the normal, first-class way to look at an image, not a fallback. Generation (where noted) routes through the `kit-codex` skill (`gpt-image-2` â€” see `skills/kit-codex/references/image-generation.md`).

## Batch Analysis for Rapid Iteration

Analyze multiple generations simultaneously:

1. Generate 3 variations via `kit-codex`, each with a variation-specific twist on the same base prompt: `docs/assets/var-1.png`, `docs/assets/var-2.png`, `docs/assets/var-3.png`.
2. `Read` each of the three images and rank them 1-3 with scores, identifying the winner. Write findings to `docs/assets/batch-analysis.md`.

## Contextual Testing

Test assets in actual UI context:

1. **Mock up UI overlay** (use design tool or code)
2. **Capture screenshot** of asset with real UI elements
3. **Analyze integrated version** for readability, hierarchy, contrast

`Read` `docs/assets/hero-mockup-with-ui.png` and evaluate this hero section with actual UI:
1. Headline readability over image
2. CTA button visibility and contrast
3. Navigation bar integration
4. Overall visual hierarchy effectiveness

Provide WCAG contrast ratio estimates. Write findings to `docs/assets/ui-integration-test.md`.

## A/B Testing Analysis

Compare design directions objectively:

`Read` `docs/assets/design-a.png` and `docs/assets/design-b.png`, then run an A/B test analysis:

Design A: [minimalist approach]
Design B: [maximalist approach]

Compare for:
1. User attention capture (first 3 seconds)
2. Information hierarchy clarity
3. Emotional impact and brand perception
4. Conversion optimization potential
5. Target audience alignment ([describe audience])

Recommend which to A/B test in production and why. Write findings to `docs/assets/ab-test-analysis.md`.

## Iteration Strategy

When score < 6/10:

1. **Identify top 3 weaknesses** from the analysis
2. **Address each in a refined prompt**
3. **Regenerate via `kit-codex`** with the refined prompt
4. **Re-analyze via `Read`** before committing to the final version
5. **Iterate until score â‰¥ 7/10**

Example: first attempt scores 5/10 â€” "colors too muted, composition unbalanced".

1. Refine the prompt: "[original prompt] + vibrant saturated colors, dynamic diagonal composition"
2. Regenerate via `kit-codex` â†’ `docs/assets/hero-v2.png`
3. `Read` `docs/assets/hero-v2.png` and re-apply the same evaluation criteria. Write findings to `docs/assets/analysis-v2.md`.

## Documentation Strategy

Save analysis reports for design system documentation:

```
docs/
  assets/
    hero-image.png
    hero-analysis.md       # Analysis report
    hero-color-palette.md  # Extracted colors
  design-guidelines/
    asset-usage.md         # Guidelines derived from analysis
```
