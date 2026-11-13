# NOTICE

This repository is a personal, independently maintained copy of an agent-skills
kit, adapted for a global (user-level) Claude Code install rather than the
per-project install the original assumes.

Maintainer of this copy: ngothanhdat

## Modifications

Copyright (c) 2026 ngothanhdat

Changes made in this copy are licensed under the same terms as the component
they modify. Notable deviations from upstream:

- Installed at user level (`~/.claude/`) instead of per project. Agent files are
  generated with absolute `~/.claude/...` paths; hooks are wired through
  `~/.claude/hooks/kit/` and read a global `~/.kit.json`.
- `kit-chrome-profile` is present in the source tree but not enabled, as it
  requires `chrome-devtools-mcp`.

## Upstream components

The kit as a whole originates from `hs-skills` by Danielle
(https://github.com/danielleit241/hs-skills), under the ISC License. The full
text is in `LICENSE` and is retained unchanged.

Individual skills carry their own terms, retained in place:

| License | Components |
| --- | --- |
| ISC | the kit as a whole — see `LICENSE` |
| Apache-2.0 | `kit-agent-browser`, `kit-web-testing`, and `kit-frontend-design`, `kit-mcp-builder`, `kit-show-off`, `kit-skill-creator` (terms in each skill's `LICENSE.txt`) |
| MIT | `kit-advise`, `kit-backend-development`, `kit-better-auth`, `kit-bootstrap`, `kit-brainstorm`, `kit-chrome-profile`, `kit-codex`, `kit-databases`, `kit-deploy`, `kit-devops`, `kit-media-processing`, `kit-payment-integration`, `kit-plan`, `kit-research`, `kit-sequential-thinking`, `kit-ship`, `kit-threejs`, `kit-ui-styling`, `kit-web-frameworks` |

Components with their own copyright holders:

- `kit-tech-graph` — Copyright (c) 2025 fireworks-tech-graph contributors
- `kit-chrome-profile` — Copyright (c) 2026 chrome-profile-cdp contributors
- `kit-document-skills/kit-docx`, `kit-pdf`, `kit-pptx`, `kit-xlsx` — Apache-2.0,
  terms in each subdirectory's `LICENSE.txt`

Every upstream `LICENSE` and `LICENSE.txt` in this tree is kept as published.
Removing them would withdraw the grant that permits this copy to exist.
