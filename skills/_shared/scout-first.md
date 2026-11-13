# HARD-GATE-SCOUT-FIRST (canonical pattern)

Shared shape of the `<HARD-GATE-SCOUT-FIRST>` block used by kit-cook, kit-fix, and kit-brainstorm. Each skill keeps its own domain-specific 5-item checklist inline (bug-focused for kit-fix, task-focused for kit-cook, topic-focused for kit-brainstorm) — only the pattern and the closing rule are shared here.

## The pattern

```
<HARD-GATE-SCOUT-FIRST>
Always scan the codebase BEFORE asking clarifying questions, forming hypotheses, or proposing approaches. No exceptions.

Mandatory scout outputs (collect first):
1. Project type, language(s), framework(s) — from package.json/pyproject.toml/go.mod/Cargo.toml/etc.
2. [Domain-specific item — e.g. affected files + callers, relevant modules, symptom location]
3. [Domain-specific item — e.g. related tests, existing docs/plans, current patterns]
4. Recent history relevant to the task (git log, recent commits touching scouted files)
5. Existing patterns/conventions so the output matches them; constraints (public APIs, schemas, tech-stack lock-in)

State a 3-6 bullet codebase-context summary to the user before asking any question or proposing any approach.
</HARD-GATE-SCOUT-FIRST>
```

## Why

Clarifying questions or proposals made WITHOUT codebase context produce vague answers, mismatched patterns, and wasted cycles. Scout first, then ask specific questions or design against what already exists.

## The non-negotiable rule

Regardless of item wording, every consumer's gate MUST end with the same close: **state a 3-6 bullet codebase-context summary to the user before proceeding** (to Discovery Phase / clarifying questions / planning). This is the one line that must not drift between skills.
