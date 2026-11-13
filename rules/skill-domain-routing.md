# Skill Domain Routing

When a user's task involves a specific domain, use these decision trees to pick the RIGHT skill based on user intent.

## Frontend / UI

```
User wants to...
├── Replicate a mockup, screenshot, or video    → /kit:frontend-design
├── Style with Tailwind CSS + shadcn/ui          → /kit:ui-styling
├── Choose colors, fonts, layout, design system  → /kit:ui-ux-pro-max
├── Apply React performance patterns             → /kit:react-best-practices
├── Create 3D / WebGL / Three.js experience      → /kit:threejs
├── Write GLSL shaders / procedural graphics     → /kit:shader
└── Build programmatic video with Remotion       → /kit:remotion
```

## Codebase Understanding

```
User wants to...
├── Quick file search, locate specific code     → /kit:scout
├── Onboard a new repo / dump codebase for LLM  → /kit:repomix
└── Port/adapt a feature from another repo      → /kit:xia
```

## Backend / API

```
User wants to...
├── Build REST/GraphQL API (NestJS, FastAPI, Django) → `backend-mindset`
├── Add authentication (OAuth, JWT, passkeys)        → /kit:better-auth
└── Integrate payments (Stripe, Polar, SePay)        → /kit:payment-integration
```

## Database

```
User wants to...
├── Design schemas, write SQL/NoSQL queries     → /kit:databases
├── Optimize indexes, migrations, replication   → /kit:databases
└── Add auth with database-backed sessions      → /kit:better-auth
```

## Infrastructure / Deployment

```
User wants to...
├── Deploy to Vercel, Netlify, Railway, Fly.io   → /kit:deploy
└── Docker, Kubernetes, CI/CD pipelines, GitOps   → /kit:devops
```

## Security

```
User wants to...
├── STRIDE/OWASP security audit with auto-fix    → /kit:security
└── Scan for secrets / vulnerable code patterns  → /kit:security (pattern scan mode)
```

## AI / LLM

```
User wants to...
├── Optimize context, agent architecture, memory → /kit:context-engineering
├── Analyze images / OCR / screenshots            → native Claude `Read` on the image file
├── Generate images (banners, assets, mockups)    → /kit:codex (gen-image)
└── Autonomous metric-driven iteration loop      → /kit:loop
```

## MCP (Model Context Protocol)

```
User wants to...
└── Build a new MCP server                       → /kit:mcp-builder
```

## Testing / Browser

```
User wants to...
├── Run test suites, coverage reports, TDD          → /kit:test
├── Test strategy + Playwright/Vitest/k6 runner     → /kit:web-testing
├── Drive a live browser                            → /kit:agent-browser
└── Use the user's real Chrome profile              → /kit:chrome-profile
```

## Media

```
User wants to...
└── Process video/audio (FFmpeg), images (ImageMagick) → /kit:media-processing
```

## Documentation

```
User wants to...
├── Update project docs (codebase-summary, PDR)   → /kit:docs
├── Search library/framework docs (context7)      → /kit:docs-seeker
├── Discover skills by capability / "is there a skill" → `find-skills`
├── Kit catalog and usage help                    → /kit:help
├── Inline doc diagrams (Mermaid v11)             → /kit:mermaidjs-v11
├── Publish-grade SVG/PNG diagrams (architecture) → /kit:tech-graph
├── Demo/show-off page for finished work          → /kit:show-off
├── Generate session hand-off / EOD summary       → /kit:watzup
└── Engineering journal entry                     → /kit:journal
```

## Documents / Office Files

```
User wants to...
└── Create / edit / extract from .docx / .pdf / .pptx / .xlsx → `docx` / `pdf` / `pptx` / `xlsx`
```

## Content / Visuals

```
User wants to...
├── Visual explanation, preview, slides, diagrams → /kit:preview
└── Create Excalidraw diagrams                    → /kit:excalidraw
```

## Frameworks

```
User wants to...
└── Next.js App Router, RSC, Turborepo           → /kit:web-frameworks
```

## Project / Session Management

```
User wants to...
├── Plan a feature or multi-file change           → /kit:plan
├── Implement a feature or approved plan          → /kit:cook
├── Fix a bug / deep root-cause diagnosis         → /kit:fix
├── Review code quality and security              → /kit:code-review
├── Review a GitHub pull request                  → /kit:review-pr
├── Ship pipeline (tests, review, version, PR)    → /kit:ship
├── Whole request or issue end to end, multi-agent → /kit:autopilot
├── Bootstrap a new project                       → /kit:bootstrap
├── Research options with sources                 → /kit:research
├── Brainstorm approaches with trade-offs         → /kit:brainstorm
├── Strategic advice via structured interview     → /kit:advise
├── Structured step-by-step reasoning             → `sequential-thinking`
├── Plan-progress sync / task reconciliation      → /kit:project-management
├── Organize outputs into project structure       → /kit:project-organization
├── Git commits, branches, hygiene                → /kit:git
├── Isolated worktree for a feature/fix           → /kit:worktree
├── Adjust AI coding autonomy level               → /kit:coding-level
└── Author or improve a skill                     → `skill-creator`
```

## Usage Notes

- Pick ONE skill per distinct user intent
- If a task spans two domains (e.g. "build + deploy"), suggest the primary skill and mention the secondary
- Domain skills combine with core workflow: `/kit:plan` → domain skill → `/kit:cook`
- Skills not listed here are utility skills activated on demand (e.g. `/kit:preview`, `/kit:scout`)

## Skills outside the kit

A few entries above route to skills that ship with Claude rather than to a kit
skill: `find-skills`, `skill-creator`, `sequential-thinking`, `backend-mindset`,
and the Office skills `docx` / `pdf` / `pptx` / `xlsx`. The kit once carried its
own version of each; they were removed because two skills offering the same
capability make the choice between them ambiguous and degrade both. Invoke these
by their bare name, with no `kit:` prefix.
