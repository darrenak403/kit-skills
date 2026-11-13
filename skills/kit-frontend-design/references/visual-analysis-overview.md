# Visual Analysis Overview

Use Claude's native `Read` tool directly on the image file to analyze generated assets and verify design standards. This is the normal, first-class way to look at an image â€” not a fallback.

## Purpose

- Verify generated assets align with aesthetic direction
- Ensure professional quality before integration
- Identify specific improvements needed for iteration
- Make objective design decisions based on analysis
- Extract actionable data (hex codes, composition insights)

## Quick Start

### Comprehensive Analysis
`Read` `docs/assets/generated-hero.png`, then work through the detailed prompt in `analysis-prompts.md`. Write findings to `docs/assets/analysis-report.md`.

### Compare Multiple Variations
`Read` each of `docs/assets/option-1.png`, `docs/assets/option-2.png`, and `docs/assets/option-3.png`, then work through the comparison prompt in `analysis-prompts.md`. Write findings to `docs/assets/comparison-analysis.md`.

### Extract Color Palette
`Read` `docs/assets/final-asset.png`, then extract 5-8 dominant colors with hex codes, classified as primary/accent/neutral, with suggested CSS variable names. Write to `docs/assets/color-palette.md`.

## Decision Framework

### Score â‰¥ 8/10: Proceed to Integration
**Actions**:
- Optimize for web delivery
- Create responsive variants
- Document implementation guidelines
- Extract color palette for CSS variables

### Score 6-7/10: Minor Refinements Needed
**Actions**:
- Use `kit:media-processing` skill for adjustments (brightness/contrast/saturation)
- Consider selective regeneration of problem areas
- May proceed with caution if time-constrained

### Score < 6/10: Major Iteration Required
**Actions**:
- Analyze specific failure points from report
- Refine generation prompt substantially
- Regenerate with corrected parameters
- Consider alternative aesthetic approach

## Detailed References

- `analysis-prompts.md` - All analysis prompt templates
- `analysis-techniques.md` - Advanced analysis strategies
- `analysis-best-practices.md` - Quality guidelines and pitfalls

## Example Color Extraction Output

```css
/* Extracted Color Palette */
:root {
  /* Primary Colors */
  --color-primary-600: #2C5F7D;  /* Dark teal - headers, CTAs */
  --color-primary-400: #4A90B8;  /* Medium teal - links, accents */

  /* Accent Colors */
  --color-accent-500: #E8B44F;   /* Warm gold - highlights */

  /* Neutral Colors */
  --color-neutral-900: #1A1A1A;  /* Near black - body text */
  --color-neutral-100: #F5F5F5;  /* Light gray - backgrounds */

  /* Semantic Usage */
  --color-text-primary: var(--color-neutral-900);
  --color-text-on-primary: #FFFFFF;
  --color-background: var(--color-neutral-100);
  --color-cta: var(--color-primary-600);
}
```
