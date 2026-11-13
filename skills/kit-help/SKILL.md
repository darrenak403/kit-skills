---
name: kit:help
description: Open the kit-skills help index. Use when users ask what skills are available, how the kit works, or which workflow to run.
user-invocable: true
when_to_use: "Invoke when the user asks what kit-skills can do or which skill/workflow fits their task."
---

# Help

Open the kit-skills help index when users ask what skills are available or which workflow fits their task.

Use `scripts/skills_data.yaml` as the local catalog source. Summarize the relevant skills by category, then route to the most specific installed skill when the user's task is clear.

When the user needs a command, prefer concrete `/kit:*` skill invocations and keep examples scoped to the installed kit-skills kit.
