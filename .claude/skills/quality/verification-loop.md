---
name: verification-loop
description: "A comprehensive verification system for Claude Code sessions — adapted for ByteAI (.NET backend + React frontend)."
origin: ECC (adapted for ByteAI)
---

# Verification Loop Skill

A comprehensive verification system for Claude Code sessions.

## When to Use

Invoke this skill:
- After completing a feature or significant code change
- Before creating a PR
- When you want to ensure quality gates pass
- After refactoring

---

## .NET Backend Verification

### Phase 1: Build

```bash
dotnet build ByteAI.sln 2>&1 | tail -20
```

If build fails, STOP and fix before continuing.

### Phase 2: Type Check / Compile Errors

C# is compiled — `dotnet build` IS the type check. Zero warnings policy:

```bash
dotnet build ByteAI.sln -warnaserror 2>&1 | tail -30
```

### Phase 3: Lint (Roslyn Analyzers)

```bash
# Run analyzer rules (configured in .editorconfig / Directory.Build.props)
dotnet build ByteAI.sln /p:TreatWarningsAsErrors=true 2>&1 | head -30
```

### Phase 4: Test Suite

```bash
# Run all tests with coverage
dotnet test ByteAI.sln \
  --collect:"XPlat Code Coverage" \
  --results-directory ./coverage \
  2>&1 | tail -50

# Generate coverage report
dotnet reportgenerator \
  -reports:"./coverage/**/coverage.cobertura.xml" \
  -targetdir:"./coverage/report" \
  -reporttypes:TextSummary

cat ./coverage/report/Summary.txt
```

Coverage target: **80% minimum**

### Phase 5: Security Scan

```bash
# Check for hardcoded secrets in C# files
grep -rn "password\s*=" --include="*.cs" src/ | grep -v "test\|Test\|spec" | head -10
grep -rn "apikey\|api_key\|ApiKey" --include="*.cs" src/ | grep -v "Configuration\[" | head -10

# Check NuGet packages for vulnerabilities
dotnet list package --vulnerable --include-transitive 2>&1 | head -30

# Check for Console.WriteLine left in production code
grep -rn "Console.Write" --include="*.cs" src/ | grep -v "test\|Test" | head -10
```

### Phase 6: Diff Review

```bash
git diff --stat
git diff HEAD~1 --name-only
```

---

## React Frontend Verification

### Phase 1: Build

```bash
cd client && npm run build 2>&1 | tail -20
```

### Phase 2: Type Check

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```

### Phase 3: Lint

```bash
cd client && npm run lint 2>&1 | head -30
```

### Phase 4: Tests

```bash
cd client && npm test -- --coverage 2>&1 | tail -30
```

### Phase 5: Security

```bash
cd client && npm audit 2>&1 | head -20

# Check for secrets in frontend
grep -rn "sk-\|api_key\|apiKey" --include="*.ts" --include="*.tsx" client/src/ | grep -v "process.env\|import.meta.env" | head -10
```

---

## Output Format

After running all phases, produce a verification report:

```
VERIFICATION REPORT
==================
Layer:      [Backend .NET | Frontend React]

Build:      [PASS/FAIL]
Types:      [PASS/FAIL] (X errors)
Lint:       [PASS/FAIL] (X warnings)
Tests:      [PASS/FAIL] (X/Y passed, Z% coverage)
Security:   [PASS/FAIL] (X issues)
Diff:       [X files changed]

Overall:    [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Continuous Mode

For long sessions, run verification after each major change:

```markdown
Set checkpoints:
- After completing each service method
- After finishing an API endpoint
- Before moving to next feature

Run: /verify
```

## Integration with Hooks

This skill complements PostToolUse hooks but provides deeper verification.
Hooks catch issues immediately; this skill provides comprehensive review.
