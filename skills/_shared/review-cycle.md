# Review Cycle

Mode-aware handling of `code-reviewer` subagent results: loop logic, escalation thresholds, and the canonical delegation prompt.

## Code-Reviewer Delegation Prompt (canonical)

Use this checklist whenever delegating to the `code-reviewer` subagent for a review-fix cycle:

```
delegate_agent capability(subagent_type="code-reviewer",
     prompt="Review changes against these MANDATORY checks: (a) every acceptance criterion met; (b) no regression to business logic in touchpoints/blast-radius from scout; (c) no breaking changes to public contracts (signatures, schemas, APIs, env vars) unless explicitly called out; (d) follows existing patterns from scout; (e) no new lint/type/build errors anywhere. CONTEXT — scout summary: <scout-summary>; acceptance criteria: <acceptance-criteria>. Return score (X/10), critical, warnings, suggestions, and explicitly flag any side effects to trigger HARD-GATE-NO-SIDE-EFFECTS.",
     description="Code review")
```

Substitute `<scout-summary>` / `<acceptance-criteria>` with the real scout findings and acceptance criteria for the current task. For bug-fix contexts, swap item (a) to "root cause actually addressed (not symptom-patched)".

## Autonomous / Auto-Handling Loop

Used in autonomous/auto modes — no user prompt unless escalation triggers.

```
cycle = 0
LOOP:
  1. Run code-reviewer → score, critical_count, warnings, suggestions

  2. IF score >= 9.5 AND critical_count == 0:
     → Output: "✓ Review [score]/10 - Auto-approved"
     → PROCEED to next step

  3. ELSE IF critical_count > 0 AND cycle < 3:
     → Output: "⚙ Auto-fixing [N] critical issues (cycle [cycle+1]/3)"
     → Fix critical issues
     → Re-run tests
     → cycle++, GOTO LOOP

  4. ELSE IF cycle >= 3:
     → ESCALATE to user via ask_user capability
     → Display findings
     → Options: "Fix manually" / "Approve anyway" / "Abort"

  5. ELSE (score < 9.5, no critical):
     → Output: "✓ Review [score]/10 - Approved with [N] warnings"
     → PROCEED (warnings logged, not blocking)
```

## Interactive / Human-in-the-Loop Loop

Used in interactive/HITL/parallel/code modes — always prompts the user.

```
cycle = 0
LOOP:
  1. Run code-reviewer → score, critical_count, warnings, suggestions

  2. DISPLAY FINDINGS:
     ┌─────────────────────────────────────────┐
     │ Code Review Results: [score]/10         │
     ├─────────────────────────────────────────┤
     │ Summary: [what implemented], tests      │
     │ [X/X passed]                            │
     ├─────────────────────────────────────────┤
     │ Critical Issues ([N]): MUST FIX         │
     │  - [issue] at [file:line]               │
     │ Warnings ([N]): SHOULD FIX              │
     │  - [issue] at [file:line]               │
     │ Suggestions ([N]): NICE TO HAVE         │
     │  - [suggestion]                         │
     └─────────────────────────────────────────┘

  3. ask_user capability (header: "Review & Approve"):
     IF critical_count > 0:
       - "Fix critical issues" → fix, re-run tester, cycle++, LOOP
       - "Fix all issues" → fix all, re-run tester, cycle++, LOOP
       - "Approve anyway" → PROCEED
       - "Abort" → stop
     ELSE:
       - "Approve" → PROCEED
       - "Fix warnings/suggestions" → fix, cycle++, LOOP
       - "Abort" → stop

  4. IF cycle >= 3 AND user selects fix:
     → "⚠ 3 review cycles completed. Final decision required."
     → ask_user capability: "Approve with noted issues" / "Abort workflow"
```

## Quick Mode Variant

Lighter-weight variant of the Autonomous loop for trivial/quick-mode fixes:

- Lower threshold: score >= 8.5 acceptable (vs 9.5 elsewhere)
- Only 1 auto-fix cycle before escalate (vs 3 elsewhere)
- Focus scope: correctness, security, no regressions

## Critical Issues Definition (always block)

- Security: XSS, SQL injection, OWASP vulnerabilities
- Performance: bottlenecks, inefficient algorithms (e.g. O(n²) when O(n) possible)
- Architecture: violations of patterns, coupling
- Principles: YAGNI, KISS, DRY violations
- Data loss risks
- Breaking changes without migration

## Output Formats

- Waiting: `⏸ Step N: Code reviewed - [score]/10 - WAITING for approval`
- After fix: `✓ Step N: [old]/10 → Fixed [N] issues → [new]/10 - Approved`
- Auto-approved: `✓ Step N: Code reviewed - 9.8/10 - Auto-approved`
- Approved: `✓ Step N: Code reviewed - [score]/10 - User approved`

## Hard caps

- Max 3 review-fix cycles in any mode (1 in Quick Mode) before mandatory escalation to the user — never loop indefinitely.
