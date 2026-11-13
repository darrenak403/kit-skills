# Internal Scouting with Explore Subagents

Use Explore subagents when SCALE >= 6 or external tools unavailable, and only
when the active runtime permits the `delegate_agent` capability.

## Delegation Gate

Do not spawn Explore only because this reference says to use Explore. Spawn
Explore only when:
- The user explicitly asked for subagents, delegation, or parallel agent work.
- The active runtime exposes a delegate_agent capability.
- Each subagent has a distinct scope and useful work to do.

If any condition is false, scout in the main agent with `search_files`,
`read_file`, and `run_shell`.

## How It Works

Spawn multiple `Explore` subagents through the runtime's `delegate_agent`
capability to search codebase segments in parallel.

## Runtime Tool Mapping

### Claude Code

Use the native delegate call:

```text
delegate_agent capability(subagent_type="Explore", prompt="<prompt>", description="<short scope>")
```

### Codex Desktop

Explore may be a deferred tool. If `multi_agent_v1` tools are not visible, first
call `tool_search` for multi-agent spawn tools. Then call:

```text
multi_agent_v1.spawn_agent(
  agent_type="Explore",
  message="<prompt>"
)
```

Do not set a model override. The Explore role owns its runtime model
configuration. Close completed agents after collecting results so they do not
consume concurrency slots.

## Prompt Template

```
Quickly scout {DIRECTORY} for files related to: {USER_PROMPT}

Instructions:
- Search for relevant files matching the task
- Use `search_files` capability for file discovery
- List files with brief descriptions
- Timeout: 3 minutes max
- Skip if timeout reached

Report format:
## Found Files
- `path/file.ext` - description

## Patterns
- Key patterns observed
```

## Spawning Strategy

### Directory Division
Split codebase logically:
- `src/` - Source code
- `lib/` - Libraries
- `tests/` - Test files
- `config/` - Configuration
- `api/` - API routes

### Parallel Execution
- Spawn all agents in a single assistant turn when the runtime supports parallel tool calls
- Each agent gets distinct directory scope
- No overlap between agents

## Example

User prompt: "Find authentication-related files"

```
Agent 1: Scout src/auth/, src/middleware/ for auth files
Agent 2: Scout src/api/, src/routes/ for auth endpoints
Agent 3: Scout tests/ for auth tests
Agent 4: Scout lib/, utils/ for auth utilities
Agent 5: Scout config/ for auth configuration
Agent 6: Scout types/, interfaces/ for auth types
```

## Timeout Handling

- Set 3-minute timeout per agent
- Skip non-responding agents
- Don't restart timed-out agents
- Aggregate available results

## Reading File Content

Chunking procedure (identical for internal and external scouting): `chunking.md`.

## Result Aggregation

Combine results from all agents:
1. Deduplicate file paths
2. Merge descriptions
3. Note any gaps/timeouts
4. List unresolved questions
