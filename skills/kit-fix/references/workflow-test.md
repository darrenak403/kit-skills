# Test Failure Fix Workflow

For fixing failing tests and test suite issues. Uses native Claude Tasks for phase tracking.

## Task Setup (Before Starting)

```
T1 = manage_plan create operation(subject="Compile & collect failures", activeForm="Compiling and collecting failures")
T2 = manage_plan create operation(subject="Debug root causes",          activeForm="Debugging test failures",       addBlockedBy=[T1])
T3 = manage_plan create operation(subject="Plan fixes",                 activeForm="Planning fixes",                addBlockedBy=[T2])
T4 = manage_plan create operation(subject="Implement fixes",             activeForm="Implementing fixes",            addBlockedBy=[T3])
T5 = manage_plan create operation(subject="Re-test",                     activeForm="Re-running tests",              addBlockedBy=[T4])
T6 = manage_plan create operation(subject="Code review",                 activeForm="Reviewing code",                addBlockedBy=[T5])
```

## Workflow

### Step 1: Compile & Collect Failures
`manage_plan update operation(T1, status="in_progress")`
Use `tester` agent. Fix all syntax errors before running tests.

- Run full test suite, collect all failures
- Group failures by module/area

`manage_plan update operation(T1, status="completed")`

### Step 2: Debug
`manage_plan update operation(T2, status="in_progress")`
Use `debugger` agent for root cause analysis.

- Analyze each failure group
- Identify shared root causes across failures

`manage_plan update operation(T2, status="completed")`

### Step 3: Plan
`manage_plan update operation(T3, status="in_progress")`
Use `planner` agent for fix strategy.

- Prioritize fixes (shared root causes first)
- Identify dependencies between fixes

`manage_plan update operation(T3, status="completed")`

### Step 4: Implement
`manage_plan update operation(T4, status="in_progress")`
Implement fixes step by step per plan.

`manage_plan update operation(T4, status="completed")`

### Step 5: Re-test
`manage_plan update operation(T5, status="in_progress")`
Use `tester` agent. If tests still fail → keep T5 `in_progress`, loop back to Step 2.

`manage_plan update operation(T5, status="completed")`

### Step 6: Review
`manage_plan update operation(T6, status="in_progress")`
Use `code-reviewer` agent.

`manage_plan update operation(T6, status="completed")`

## Common Commands
```bash
npm test
bun test
pytest
go test ./...
```

## Tips
- Run single failing test first for faster iteration
- Check test assertions vs actual behavior
- Verify test fixtures/mocks are correct
- Don't modify tests to pass unless test is wrong
