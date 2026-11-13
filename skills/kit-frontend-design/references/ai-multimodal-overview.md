# AI-Assisted Visual Work for Frontend Design

Entry point for generating and analyzing visual assets that align with frontend design thinking and aesthetic guidelines. Analysis uses Claude's native `Read` tool directly on image files. Generation routes to the `kit-codex` skill (`gpt-image-2`).

## When to Use

Reach for AI-assisted visual work in frontend design when you need to:

**Asset Generation**:
- Generate hero images, background assets, decorative elements
- Create placeholder images with specific aesthetic qualities
- Produce marketing visuals that match UI design language
- Generate icon sets, illustrations, or graphic elements
- Create texture overlays, gradient meshes, or background patterns
- Prototype visual concepts before implementing in code

**Visual Analysis**:
- Analyze generated assets to verify they meet design standards
- Compare multiple variations objectively with ratings
- Extract exact color palettes with hex codes for implementation
- Test assets with UI overlays for readability and contrast

**Design Extraction**:
- Extract design guidelines from existing images or videos
- Analyze competitor designs to understand their approach
- Reverse-engineer design systems from inspiration screenshots
- Create documented guidelines based on visual analysis
- Establish consistent aesthetic direction from references

## Core Principles

### 1. Design-Driven Generation
**NEVER** generate generic AI imagery. Every asset must align with:
- The chosen aesthetic direction (brutalism, maximalism, retro-futurism, etc.)
- Typography system and visual hierarchy
- Color palette and theme consistency
- Overall design story and purpose

### 2. Contextual Asset Creation
Assets aren't standaloneâ€”they're part of a cohesive interface. Consider:
- **Purpose**: Hero image vs. background texture vs. decorative element
- **Integration**: How it interacts with overlaid text, buttons, forms
- **Technical constraints**: File size, aspect ratio, responsive behavior
- **Accessibility**: Color contrast, text readability, decorative vs. informative

### 3. Analysis via Read Is Mandatory
Never integrate assets without comprehensive analysis. Use Claude's native `Read` tool directly on the image file — this is the normal, first-class way to look at generated or reference images, not a fallback:
- Score quality objectively (1-10 scale, minimum 7/10)
- Extract specific values: hex codes, not "blue"; px sizes, not "large"
- Compare multiple variations before deciding
- Test with UI overlays, not in isolation

### 4. Learn from Excellence
Extract design systems systematically from high-quality references:
- Analyze 3-5 screens to identify patterns
- Document actionably with CSS variables and exact values
- Validate predictions (fonts, colors) manually
- Adapt principles contextually, don't copy blindly

## Workflow Quick Reference

### For Asset Generation
**See**: `asset-generation.md`

1. Define design context (aesthetic, colors, typography, tone)
2. Craft design-driven prompts (not generic)
3. Generate via the `kit-codex` skill (`gpt-image-2`)
4. Analyze and verify quality (score â‰¥ 7/10) with `Read`
5. Iterate or integrate based on results

**Generation**: see `skills/kit-codex/references/image-generation.md` for invocation, prompt templates, and the chroma-key transparency workflow.

### For Visual Analysis
**See**: `visual-analysis.md`

1. Define evaluation criteria (context-specific)
2. Run comprehensive analysis using `Read` on the image, guided by structured prompts
3. Compare multiple variations objectively
4. Extract color palettes with hex codes
5. Test integration with UI elements

**Tool**: Claude's native `Read` tool on the image file (first-class, no setup needed)

### For Design Extraction
**See**: `design-extraction.md`

1. Capture high-quality reference screenshots
2. Extract comprehensive design elements systematically using `Read`
3. Analyze multiple screens for consistent patterns
4. Video motion guideline extraction is out of scope (no native-Claude video analysis)
5. Document actionably with CSS-ready specifications

**Tool**: Claude's native `Read` tool on the image file (first-class, no setup needed)

## Integration with Other Skills

### With `aesthetic` Skill
Use `aesthetic` for overall design system guidance and quality evaluation framework. Then use `kit:frontend-design` with the `kit-codex` skill (generation) and `Read` (analysis) for asset work that follows those guidelines.

### With `kit:agent-browser`
Use `kit:agent-browser` to capture screenshots from inspiration websites for design extraction. Capture at actual viewport size, not full-page scrolls.

### With `ui-styling` Skill
Generate and analyze assets first, then implement using shadcn/ui + Tailwind with colors/styles that complement the generated imagery.

### With `web-frameworks` Skill
Optimize generated assets for Next.js App Router: image optimization, responsive images, lazy loading.

### With `kit:media-processing` Skill
Post-process generated assets: resize, compress, add filters, create compositions using FFmpeg/ImageMagick.

## Navigation

**Detailed Workflows**:
- `asset-generation.md` - Complete generation workflow with prompt strategies
- `visual-analysis.md` - Analysis and verification workflow
- `design-extraction.md` - Extract guidelines from existing designs

**Additional Resources**:
- `technical-guide.md` - File optimization, examples, checklists, common pitfalls
- `animejs.md` - Animation implementation for frontend

## Quick Reference

**Generate asset**: use the `kit-codex` skill â€” see `skills/kit-codex/references/image-generation.md` for the `$imagegen` invocation pattern, prompt templates, and chroma-key transparency workflow.

**Analyze asset**: use the `Read` tool on `docs/assets/[image].png`, then evaluate against your criteria (aesthetic fit, color harmony, composition, readability, quality score).

**Extract design guidelines**: use the `Read` tool on `docs/inspiration/[reference].png`, then work through the extraction criteria in `design-extraction.md` and write findings to `docs/design-guidelines/extracted.md`.

## Remember

1. **Design First, Generate Second**: Start with design thinking, not generation capabilities
2. **Context is King**: Every asset serves the interface, not itself
3. **Iterate Ruthlessly**: First generation is rarely finalâ€”evaluate and refine
4. **Analysis via Read Is Mandatory**: Never integrate without comprehensive verification (â‰¥7/10)
5. **Demand Specifics**: Hex codes not "blue", px not "large", ms not "fast"
6. **Learn from Excellence**: Extract design systems from high-quality references systematically
7. **Adapt, Don't Copy**: Understand principles, apply contextually to your unique design

Generate assets that elevate frontend design, maintain aesthetic consistency, and serve user experienceâ€”never generic, always contextual.
