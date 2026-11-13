---
name: kit:security
description: "STRIDE + OWASP-based security audit with optional red-team persona discovery loop, lightweight secret/vulnerability pattern scan, and guarded auto-fix. Scans code for vulnerabilities from multiple attacker perspectives (auth attacker, supply chain, insider, infrastructure), categorizes by severity, and can iteratively fix findings with a regression guard."
user-invocable: true
when_to_use: "Invoke for threat-modeled security audit or auto-fix loops."
category: utilities
keywords:
  [
    security,
    STRIDE,
    OWASP,
    audit,
    red-team,
    penetration-testing,
    vulnerability-discovery,
  ]
argument-hint: "<scope glob or 'full'> [--fix] [--red-team] [--iterations N]"
metadata:
  author: kit
  attribution: "Security audit pattern adapted from autoresearch by Udit Goenka (MIT)"
  license: MIT
  version: "1.0.0"
---

# kit:security — Security Audit

Runs a structured STRIDE + OWASP security audit on a given scope. Produces a severity-ranked findings report. With `--fix`, applies fixes iteratively under a regression guard (tests/lint after every fix).

## When to Use

- Before a release or major deployment
- After adding auth, payment, or data-handling features
- Periodic security review (monthly/quarterly)
- Compliance check (SOC 2, GDPR, PCI-DSS prep)

## When NOT to Use

- Purely cosmetic changes (CSS, copy edits)
- No user-facing code or data handling involved

---

## Modes

| Mode               | Invocation                                       | Behavior                                                  |
| ------------------ | ------------------------------------------------ | --------------------------------------------------------- |
| Audit only         | `/kit:security <scope>`                           | Scan → categorize → report (one-shot)                     |
| Red-team discovery | `/kit:security <scope> --red-team`                | Iterate 4 attacker personas → STRIDE/OWASP sweep → report |
| Bounded red-team   | `/kit:security <scope> --red-team --iterations N` | Cap persona discovery to N iterations total               |
| Audit + Fix        | `/kit:security <scope> --fix`                     | Scan → categorize → fix iteratively                       |
| Red-team + Fix     | `/kit:security <scope> --red-team --fix`          | Full persona discovery → fix confirmed Critical/High      |
| Bounded fix        | `/kit:security <scope> --fix --iterations N`      | Limit fix iterations to N                                 |

---

## Audit Methodology

### 1. Scope Resolution

Expand the provided glob or `full` keyword into a file list. Read all in-scope files before analysis.

### 2. STRIDE Analysis

Evaluate each threat category systematically:

- **S**poofing — identity/authentication weaknesses
- **T**ampering — input validation, integrity controls
- **R**epudiation — audit logging gaps
- **I**nformation Disclosure — data leakage, secret exposure
- **D**enial of Service — rate limits, resource exhaustion
- **E**levation of Privilege — broken access control, RBAC gaps

### 3. OWASP Top 10 Check

Map findings to OWASP categories (A01–A10). See `references/stride-owasp-checklist.md` for per-category checks.

### 4. Dependency Audit

Run the appropriate package audit tool for the detected stack:

- Node.js: `npm audit`
- Python: `pip-audit`
- Go: `govulncheck`
- Ruby: `bundle audit`

### 5. Secret Detection

Scan for hardcoded API keys, passwords, tokens, and private keys using regex patterns. See `references/secret-patterns.md` (full regex catalog) and `references/stride-owasp-checklist.md` → Secret Patterns.

### 5a. Pattern Scan (lightweight mode)

For a fast, audit-lite pass (pre-commit, CI, or scoping a full audit), run only
the pattern scan: apply `references/secret-patterns.md` (hardcoded secrets) and
`references/vulnerability-patterns.md` (common vulnerable code shapes — SQL
concatenation, unsafe deserialization, path traversal, weak crypto) against the
scope and report matches with file:line. No STRIDE/persona analysis is run in
this mode.

### 6. Finding Categorization

Assign each finding a severity level (see Severity Definitions below).

---

## Output Format

```
## Security Audit Report

### Summary
- Files scanned: N
- Findings: X critical, Y high, Z medium, W low, V info

### Findings

| # | Severity | Category | File:Line | Description | Fix Recommendation |
|---|----------|----------|-----------|-------------|-------------------|
| 1 | Critical  | Injection | api/users.ts:45 | SQL string concatenation | Use parameterized queries |
| 2 | High      | Auth      | auth/login.ts:12 | No rate limiting | Add express-rate-limit |
```

---

## Red-Team Discovery Mode (--red-team)

When `--red-team` is provided, the audit runs a **multi-persona iterative discovery loop** before (or instead of) the standard one-shot STRIDE/OWASP sweep. Each persona represents a distinct attacker mindset with its own threat model and probe targets.

### Persona Execution Order

1. **Security Adversary** — external hacker; auth bypass, injection, IDOR, privilege escalation
2. **Supply Chain Attacker** — dependency/CI poisoning; CVEs, unsigned artifacts, overly permissive CI
3. **Insider Threat** — compromised internal account; horizontal/vertical escalation, bulk export, audit gaps
4. **Infrastructure Attacker** — runtime/deployment foothold; SSRF, secrets in env, container misconfig

Each persona phase follows the iterative discovery protocol:

- Select next untested attack vector from persona's probe list
- Assume that attacker's mindset — reason as adversary, not defender
- Probe relevant code, trace data flows, find missing guards
- Validate with proof (file:line, attack scenario, impact)
- Log to `security-audit-results.tsv` with `persona` column
- Chain: prior persona findings compound into later phases

After all 4 personas complete, a standard STRIDE/OWASP sweep fills remaining coverage gaps.

> See `references/red-team-personas.md` for the full persona catalog: threat models, typical attack vectors, and per-persona probe checklists.

### Credential Hygiene (Mandatory)

All findings across every persona MUST mask secret values before logging. Never emit raw JWTs (`eyJ...`), 32+ char hex strings, AWS key prefixes (`AKIA`, `ASIA`), or connection strings with embedded passwords. Use `<REDACTED_TOKEN>`, `<REDACTED_PASSWORD>`, or reference the env var name only.

---

## Fix Mode (--fix)

When `--fix` is provided, apply fixes iteratively after the audit:

1. Sort all findings by severity (Critical → High → Medium → Low)
2. For each finding:
   a. Apply one targeted fix
   b. Run guard (tests or lint) to verify no regression
   c. Commit: `security(fix-N): <short description>`
   d. Advance to next finding
3. Stop early if guard fails — report the failure instead of proceeding
4. Guard pattern (verify-after-every-fix) follows the `kit:loop` guard protocol

> Tip: Use `--iterations N` to cap total fix iterations when scope is large.

---

## Severity Definitions

| Severity | Description                                          | Fix Priority              |
| -------- | ---------------------------------------------------- | ------------------------- |
| Critical | Exploitable now, data breach or RCE risk             | Immediate — block release |
| High     | Exploitable with moderate effort, significant impact | This sprint               |
| Medium   | Limited exploitability or impact                     | Next sprint               |
| Low      | Theoretical risk, defense-in-depth improvement       | Backlog                   |
| Info     | Best practice suggestion, no direct risk             | Optional                  |

---

## Integration with Other Skills

- Use `kit:research` for source-backed remediation research on unfamiliar vulnerability classes
- Use `kit:loop` for long-running iterative fix campaigns with guard + results logging
- Pair with `kit:plan` to schedule Medium/Low findings as sprint tasks

---

## Example Invocations

```bash
# One-shot audit — API layer only
/kit:security src/api/**/*.ts

# Red-team discovery — full codebase, all 4 personas
/kit:security full --red-team

# Red-team discovery — bounded to 20 iterations total
/kit:security src/ --red-team --iterations 20

# Red-team discovery + auto-fix confirmed Critical/High
/kit:security full --red-team --fix

# One-shot audit + auto-fix, max 15 iterations
/kit:security src/ --fix --iterations 15
```

---

See `references/stride-owasp-checklist.md` for the detailed per-category checklist and secret detection regex patterns.

See `references/red-team-personas.md` for the full persona catalog: threat models, attack vectors, probe checklists, discovery loop integration, and TSV schema extension for `--red-team` mode.

---

## Lineage

Security audit pattern adapted from an upstream MIT-licensed project by Udit Goenka (see `metadata.attribution`). The local version supports one-shot STRIDE + OWASP audit, the red-team-personas iterative discovery loop, and the lightweight pattern scan absorbed from the former standalone scan skill.
