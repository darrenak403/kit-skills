# Extract Design Guidelines from Existing Assets

Reverse-engineer design principles from existing images or videos to establish design guidelines.

## Purpose

- Analyze competitor designs to understand their approach
- Extract design systems from inspiration screenshots
- Learn from high-quality design examples
- Create documented guidelines based on visual analysis
- Establish consistent aesthetic direction from references

## Use Cases

- Analyzing competitor websites or apps
- Learning from inspiration galleries (Dribbble, Awwwards, Mobbin)
- Extracting design systems from brand materials
- Reverse-engineering successful interfaces
- Creating design documentation from visual references

## Quick Workflows

Extraction uses Claude's native `Read` tool directly on the image file â€” the normal, first-class way to look at a reference image, not a fallback.

### Single Image Analysis
`Read` `docs/inspiration/reference-design.png`, then work through the extraction prompt in `extraction-prompts.md`. Write findings to `docs/design-guidelines/extracted-design-system.md`.

### Multi-Screen System Extraction
`Read` each of `docs/inspiration/home.png` and `docs/inspiration/about.png`, then work through the multi-screen prompt in `extraction-prompts.md`. Write findings to `docs/design-guidelines/complete-design-system.md`.

### Video Motion Analysis
Out of scope â€” there is no native-Claude video analysis replacement for the retired CLI-based video path. If motion guidelines are needed, extract them manually from key frames (screenshot stills and `Read` those) or note the gap.

### Competitive Analysis
`Read` each of `competitor-a.png`, `competitor-b.png`, and `competitor-c.png`, then work through the competitive prompt in `extraction-prompts.md`. Write findings to `docs/design-guidelines/competitive-analysis.md`.

## Detailed References

- `extraction-prompts.md` - All extraction prompt templates
- `extraction-best-practices.md` - Capture quality, analysis tips
- `extraction-output-templates.md` - Documentation formats

## Integration

After extraction, use guidelines with `asset-generation.md` for generating design-aligned visual assets.
