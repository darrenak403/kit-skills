# Domain Routing

Use this file only when choosing between installed skills. If the user
asks to discover or install external skills, return to `../SKILL.md` and use the
Skills CLI flow.

## Routing Rules

- If the user names a skill, use that skill.
- Pick one primary skill per distinct intent. Mention secondary skills only as
  follow-up helpers.
- If two skills overlap, prefer the more specific domain skill over a generic
  workflow skill.

## Core Workflow

| User intent | Primary skill |
|---|---|
| Plan a feature, migration, or multi-file change | `/kit:plan` |
| Implement a feature or approved plan | `/kit:cook` |
| Fix a bug, error, test failure, or CI issue (incl. deep root-cause diagnosis) | `/kit:fix` |
| Review code quality and security | `/kit:code-review` |
| Review a GitHub pull request | `/kit:review-pr` |
| Ship: tests, review, version, PR pipeline | `/kit:ship` |
| Whole request or GitHub issue end to end, multi-agent orchestration, token budget | `/kit:autopilot` |
| Bootstrap a new project from scratch | `/kit:bootstrap` |
| Initialize/refresh AI project docs | `/kit:docs` |

## Discovery, Research, and Decision Support

| User intent | Primary skill |
|---|---|
| Locate files or understand code quickly | `/kit:scout` |
| Pack a repository for LLM use | `/kit:repomix` |
| Research technical options with sources | `/kit:research` |
| Brainstorm approaches with trade-offs | `/kit:brainstorm` |
| Strategic advice via structured interview | `/kit:advise` |
| Structured step-by-step reasoning | `/kit:sequential-thinking` |
| Discover skills by capability / "is there a skill" | `/kit:find-skills` |
| Kit catalog, usage help | `/kit:help` |
| Port/adapt a feature from another repo | `/kit:xia` |

## Frontend and UI

| User intent | Primary skill |
|---|---|
| Replicate a mockup, screenshot, or video | `/kit:frontend-design` |
| Style with Tailwind or shadcn/ui | `/kit:ui-styling` |
| Choose color, typography, layout, or design system | `/kit:ui-ux-pro-max` |
| Apply React or Next.js performance patterns | `/kit:react-best-practices` |
| Build 3D, WebGL, or Three.js scenes | `/kit:threejs` |
| Write shaders or procedural graphics | `/kit:shader` |
| Build programmatic video with Remotion | `/kit:remotion` |
| Create Excalidraw diagrams | `/kit:excalidraw` |

## Backend, Data, and Auth

| User intent | Primary skill |
|---|---|
| Build REST, GraphQL, or backend services | `/kit:backend-development` |
| Add auth, OAuth, sessions, or passkeys | `/kit:better-auth` |
| Design schemas or write SQL/NoSQL queries | `/kit:databases` |
| Integrate Stripe, Polar, Paddle, or SePay | `/kit:payment-integration` |

## Infrastructure and Security

| User intent | Primary skill |
|---|---|
| Deploy to hosted platforms | `/kit:deploy` |
| Docker, Kubernetes, CI/CD, or cloud ops | `/kit:devops` |
| STRIDE/OWASP audit, secret/vulnerability pattern scan, remediation | `/kit:security` |

## AI, MCP, and Browser Automation

| User intent | Primary skill |
|---|---|
| Context, memory, or agent architecture | `/kit:context-engineering` |
| Analyze images / OCR / screenshots | native Claude `Read` on the image file |
| Generate images (banners, assets, mockups) | `/kit:codex` (gen-image) |
| Second-opinion code/PR/plan review, edge-case audit | `/kit:codex` |
| Build MCP servers | `/kit:mcp-builder` |
| Test generic browser workflows | `/kit:agent-browser` |
| Use the user's real Chrome profile | `/kit:chrome-profile` |
| Autonomous metric-driven iteration loop | `/kit:loop` |

## Testing, Docs, and Media

| User intent | Primary skill |
|---|---|
| Run tests, coverage, or TDD gates | `/kit:test` |
| Playwright, Vitest, k6, visual or a11y tests | `/kit:web-testing` |
| Project docs init/update/summarize | `/kit:docs` |
| Library/framework docs lookup | `/kit:docs-seeker` |
| Office documents: docx, pdf, pptx, xlsx | `/kit:document-skills` |
| Visual explanation, preview, slides, or diagrams | `/kit:preview` |
| Mermaid syntax | `/kit:mermaidjs-v11` |
| Publish-grade technical diagrams | `/kit:tech-graph` |
| Video/audio/image processing | `/kit:media-processing` |
| Demo/show-off page for finished work | `/kit:show-off` |

## Frameworks and Platforms

| User intent | Primary skill |
|---|---|
| Next.js, App Router, RSC, Turborepo | `/kit:web-frameworks` |

## Project and Session Management

| User intent | Primary skill |
|---|---|
| Plan-progress sync, task reconciliation | `/kit:project-management` |
| Organize outputs/reports into project structure | `/kit:project-organization` |
| Git commits, branches, worktree hygiene | `/kit:git` |
| Isolated worktree for a feature/fix | `/kit:worktree` |
| Session hand-off / EOD summary | `/kit:watzup` |
| Engineering journal entry | `/kit:journal` |
| Adjust AI coding autonomy level | `/kit:coding-level` |
| Author or improve a skill | `/kit:skill-creator` |
