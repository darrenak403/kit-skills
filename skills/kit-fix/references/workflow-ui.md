# UI Fix Workflow

For fixing visual/UI issues. Requires design skills. Uses native Claude Tasks for phase tracking.

## Required Skills (activate in order)
1. `kit:ui-ux-pro-max` - Design database (ALWAYS FIRST)
2. `kit:ui-ux-pro-max` - Design principles
3. `kit:frontend-design` - Implementation patterns

## Pre-fix Research

Canonical invocation (note: hardcodes the `kit-ui-ux-pro-max` skill dir — if that skill is ever renamed, this path breaks):
```bash
python3 {config-dir}/skills/kit-ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
```

Run with:
| Query | Domain |
|---|---|
| `<product-type>` | `product` |
| `<style>` | `style` |
| `accessibility` | `ux` |

## Task Setup (Before Starting)

```
T1 = manage_plan create operation(subject="Analyze visual issue",    activeForm="Analyzing visual issue")
T2 = manage_plan create operation(subject="Implement UI fix",         activeForm="Implementing UI fix",       addBlockedBy=[T1])
T3 = manage_plan create operation(subject="Verify visually",          activeForm="Verifying visually",         addBlockedBy=[T2])
T4 = manage_plan create operation(subject="DevTools check",           activeForm="Checking with DevTools",     addBlockedBy=[T3])
T5 = manage_plan create operation(subject="Test compilation",         activeForm="Testing compilation",        addBlockedBy=[T4])
T6 = manage_plan create operation(subject="Update design docs",       activeForm="Updating design docs",       addBlockedBy=[T5])
```

## Workflow

### Step 1: Analyze
`manage_plan update operation(T1, status="in_progress")`
Analyze screenshots/videos with the native `Read` tool.

- Read `./docs/design-guidelines.md` first
- Identify exact visual discrepancy

`manage_plan update operation(T1, status="completed")`

### Step 2: Implement
`manage_plan update operation(T2, status="in_progress")`
Use `ui-ux-designer` agent.

`manage_plan update operation(T2, status="completed")`

### Step 3: Verify Visually
`manage_plan update operation(T3, status="in_progress")`
Screenshot + native `Read` tool analysis.

- Capture parent container, not whole page
- Compare to design guidelines
- If incorrect → keep T3 `in_progress`, loop back to Step 2

`manage_plan update operation(T3, status="completed")`

### Step 4: DevTools Check
`manage_plan update operation(T4, status="in_progress")`
Use `kit:agent-browser`, Chrome MCP / `chrome-devtools-mcp`, or project-native browser tests.

`manage_plan update operation(T4, status="completed")`

### Step 5: Test
`manage_plan update operation(T5, status="in_progress")`
Use `tester` agent for compilation check.

`manage_plan update operation(T5, status="completed")`

### Step 6: Document
`manage_plan update operation(T6, status="in_progress")`
Update `./docs/design-guidelines.md` if needed.

`manage_plan update operation(T6, status="completed")`

## Tips
- Use `kit:codex` for generating visual assets
- Use `ImageMagick` for image editing
