# Technical Guide Overview

Technical considerations and best practices for AI-assisted visual work in frontend design. Generation routes through the `kit-codex` skill (`gpt-image-2`); analysis uses Claude's native `Read` tool directly on the image file; file optimization uses the `kit-media-processing` skill.

## Quick Reference

### File Optimization

Use the `kit-media-processing` skill to convert `docs/assets/hero-image.png` to `docs/assets/hero-optimized.webp` at quality 85.

### Format Selection
- **WebP**: Best for web, 25-35% smaller than PNG, wide browser support
- **AVIF**: Cutting edge, 50% smaller than WebP, limited support
- **PNG**: Lossless, large file size, use for transparency
- **JPEG**: Lossy, smaller than PNG, photos without transparency

### Responsive Variants
```bash
# Desktop hero (16:9)
--aspect-ratio 16:9

# Mobile hero (9:16 or 3:4)
--aspect-ratio 9:16

# Square cards (1:1)
--aspect-ratio 1:1
```

## Detailed References

- `technical-accessibility.md` - WCAG compliance, contrast checks, alt text
- `technical-workflows.md` - Complete pipeline examples
- `technical-best-practices.md` - Checklists, quality gates
- `technical-optimization.md` - Cost strategies, model selection

## Quick Reference

**Generate** (standard quality): use the `kit-codex` skill â€” see `skills/kit-codex/references/image-generation.md` for the `$imagegen` invocation pattern. State aspect ratio (e.g. 16:9) and the design-driven prompt.

**Analyze**: use the `Read` tool on `docs/assets/[image].png`, then evaluate against your criteria. Write findings to `docs/assets/analysis.md`.

**Optimize**: use the `kit-media-processing` skill to convert `docs/assets/[image].png` to `docs/assets/[image].webp` at quality 85.

**Extract colors**: `Read` `docs/assets/[image].png` and extract 5-8 dominant colors with hex codes, classified as primary/accent/neutral. Write to `docs/assets/color-palette.md`.

## Responsive Image Strategies

**Art Direction (different crops)**:
```html
<picture>
  <source media="(min-width: 768px)" srcset="hero-desktop.webp">
  <source media="(max-width: 767px)" srcset="hero-mobile.webp">
  <img src="hero-desktop.jpg" alt="Hero image">
</picture>
```

**Resolution Switching (same crop, different sizes)**:
```html
<img
  srcset="hero-400w.webp 400w, hero-800w.webp 800w, hero-1200w.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  src="hero-800w.jpg"
  alt="Hero image"
/>
```
