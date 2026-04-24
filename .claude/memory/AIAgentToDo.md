# ByteAI — In-App Agent Plan

## Overview
A `ByteAI.Agents` C# class library that adds agent-based logic to the app. Separate from `ByteAI.Api` and `ByteAI.Core` — pure orchestration, no EF Core, no ASP.NET.

The two agents it contains:
1. **Support Terminal Agent** — user types natural language in the terminal → agent classifies and submits feedback
2. **Triage Agent** — admin clicks "Mark Reviewed" → agent greps codebase, diagnoses the issue, creates a GitHub issue

---

## Project Structure

```
Service/
├── ByteAI.Api/
├── ByteAI.Core/
├── ByteAI.Gateway/
└── ByteAI.Agents/              ← new class library
    ├── ByteAI.Agents.csproj
    ├── Abstractions/
    │   ├── IAgent.cs           ← RunAsync(goal, ct) → AgentResult
    │   ├── AgentTool.cs        ← record: Name, Description, JsonSchema, Handler
    │   ├── AgentResult.cs      ← record: Reply, Actions[], Confidence
    │   └── AgentContext.cs     ← conversation history for multi-turn
    ├── Engine/
    │   └── GeminiAgentEngine.cs  ← the tool-call loop; only place that calls Gemini HTTP
    ├── Agents/
    │   └── Support/
    │       ├── SupportAgent.cs   ← Level 1: classify + deduplicate + submit feedback
    │       └── TriageAgent.cs    ← Level 2: grep codebase + diagnose + create GitHub issue
    ├── Tools/
    │   ├── SupportTools.cs       ← submit_feedback, get_ticket_status, search_similar_tickets
    │   ├── CodebaseTools.cs      ← search_codebase (grep/rg), get_file
    │   └── GitHubTools.cs        ← create_issue, trigger_fix_workflow
    ├── Events/
    │   └── Handlers/
    │       └── FeedbackTriageHandler.cs  ← MediatR: handles FeedbackReviewedEvent
    └── Extensions/
        └── AgentsServiceExtensions.cs   ← AddByteAIAgents() — one call in Api/Program.cs
```

---

## Dependency Graph

```
ByteAI.Api ──► ByteAI.Agents ──► ByteAI.Core
     └─────────────────────────► ByteAI.Core
```

- `ByteAI.Agents` references `ByteAI.Core` for `ILlmService`, `IEmbeddingService`, `ISupportService`, MediatR events
- `ByteAI.Api` adds a single `<ProjectReference>` to `ByteAI.Agents` for DI registration only
- `ByteAI.Core` never references `ByteAI.Agents` — no circular deps

---

## ByteAI.Agents.csproj

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="..\ByteAI.Core\ByteAI.Core.csproj" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="MediatR" Version="12.5.0" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="9.0.0" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" Version="9.0.0" />
    <PackageReference Include="Octokit" Version="13.0.1" />
  </ItemGroup>
</Project>
```

---

## Agent 1 — Support Terminal Agent ⏳

**Trigger:** User types anything in the support terminal that isn't a known command (fallback from `commandParser.ts`)

**What it does:**
- Understands free-text input ("dark mode is broken", "can't upload images")
- Classifies severity and component
- Checks for duplicate open tickets before submitting
- Submits structured feedback automatically
- Returns a human-readable reply to display in the terminal

**Flow:**
```
Terminal input: "the search is broken on mobile"
  → POST /api/support/ask  { query, pageContext }
  → SupportAgent runs Gemini tool-call loop
  → tools: search_similar_tickets → classify_issue → submit_feedback
  → returns: "Filed as BUG-043 (search, high). We're on it."
```

**Tools:**
| Tool | What it does |
|---|---|
| `search_similar_tickets` | Queries `Feedback` table for open issues with similar message |
| `classify_issue` | Extracts component, severity, type from natural language |
| `submit_feedback` | Wraps `ISupportService.SubmitFeedbackAsync` |
| `get_ticket_status` | Looks up a specific ticket by ID |

**Frontend changes:**
- Add `ask` command to `commandParser.ts` — catch-all for unrecognised input
- Handle in `useTerminal.ts` → call `POST /api/support/ask` → stream lines to terminal output
- Existing explicit commands (`feedback --type X`, `history`, etc.) stay as-is

---

## Agent 2 — Triage Agent ⏳

**Trigger:** Admin clicks "Mark Reviewed" on a feedback ticket in the admin portal

**What it does:**
- Greps the codebase for files related to the reported issue
- Builds a structured diagnosis: affected files, hypothesis, confidence score
- If confidence ≥ 0.7 → creates a GitHub issue with full diagnosis attached
- Stores enriched diagnosis back on the `Feedback` record

**Flow:**
```
Admin: PUT /api/support/feedback/{id}/status  { status: "reviewed" }
  → SupportService.UpdateFeedbackStatusAsync publishes FeedbackReviewedEvent
  → FeedbackTriageHandler (MediatR) picks it up
  → TriageAgent runs Gemini tool-call loop
  → tools: search_codebase → get_file → estimate_severity → enrich_ticket
  → confidence ≥ 0.7: create_github_issue
  → Feedback record updated with diagnosis JSON
```

**Tools:**
| Tool | What it does |
|---|---|
| `search_codebase` | Shells out to `rg` (ripgrep) against the repo path |
| `get_file` | Reads a specific file at a given path |
| `estimate_severity` | Scores impact based on component + message |
| `enrich_ticket` | Writes `{ affectedFiles, hypothesis, confidence }` back to `Feedback` |
| `create_github_issue` | Octokit call with structured diagnosis as body |

**MediatR event (new in ByteAI.Core/Events/):**
```csharp
public sealed record FeedbackReviewedEvent(
    Guid FeedbackId,
    string Message,
    string? PageContext) : INotification;
```
Published in `SupportService.UpdateFeedbackStatusAsync` when `newStatus == "reviewed"`.

---

## Agent 3 — Fix Agent 🔮 (Future)

**Trigger:** GitHub issue created by Triage Agent (via GitHub Actions `issues` event — `opened` activity type)

**What it does:**
- Reads the GitHub issue body (contains the structured diagnosis: affected files, hypothesis, reproduction context)
- Uses that information to locate and understand the relevant code
- Writes a targeted fix
- Opens a PR against `main` with the fix and a link back to the originating issue

**Flow:**
```
Triage Agent creates GitHub issue  →  diagnosis attached as issue body
  → GitHub Actions workflow triggered on issues: [opened]
  → Runs: claude --print "Read issue #N and fix it. Open a PR against main."
  → Claude Code reads issue → finds affected files → writes fix → opens PR
  → PR description links back to issue + includes the original user feedback
  → You review and merge
```

**GitHub Actions workflow (`.github/workflows/fix-agent.yml`):**
```yaml
on:
  issues:
    types: [opened]
    # only fires for issues labelled "agent-fix" — set this label in GitHubTools.cs
    
jobs:
  fix:
    if: contains(github.event.issue.labels.*.name, 'agent-fix')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            Read GitHub issue #${{ github.event.issue.number }} and fix the reported bug.
            The issue body contains affected files and a hypothesis — use them as your starting point.
            Open a PR against main. Link the PR to issue #${{ github.event.issue.number }}.
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

**Label convention:** `GitHubTools.cs` sets the `agent-fix` label only when Triage Agent confidence ≥ 0.7. Lower confidence issues are created without the label — no workflow fires, human handles it manually.

**Why this stays future:**
- Requires production GitHub repo + Actions secrets configured
- Claude Code Action needs review of what it's allowed to push
- Safe to add after Support Terminal Agent + Triage Agent are live and trusted

---

## Engine — GeminiAgentEngine

The only class that knows about HTTP. Implements the tool-call loop:

```
while (true) {
    response = CallGemini(messages, tools)
    if response.FinishReason == "stop" → return response.Content
    foreach toolCall in response.ToolCalls:
        result = tools[toolCall.Name].Handler(toolCall.Arguments)
        messages.Add(ToolResultMessage(toolCall.Id, result))
}
```

Both agents share this engine — they only differ in their system prompt and tool list.

---

## API Touch Points (ByteAI.Api)

| What | Where |
|---|---|
| `POST /api/support/ask` | New action in `SupportController.cs` |
| `builder.Services.AddByteAIAgents(config)` | One line added to `Program.cs` |
| `<ProjectReference>` to `ByteAI.Agents` | `ByteAI.Api.csproj` |

No other changes to the existing API codebase.

---

## Status
- [ ] Create `ByteAI.Agents` project + add to solution
- [ ] Implement `Abstractions/` layer (`IAgent`, `AgentTool`, `AgentResult`, `AgentContext`)
- [ ] Implement `GeminiAgentEngine` (tool-call loop)
- [ ] Implement `SupportTools` + `SupportAgent`
- [ ] Add `POST /api/support/ask` endpoint
- [ ] Wire terminal frontend (`commandParser.ts` fallback + `useTerminal.ts` ask handler)
- [ ] Add `FeedbackReviewedEvent` to `ByteAI.Core/Events/`
- [ ] Publish event in `SupportService.UpdateFeedbackStatusAsync` when `newStatus == "reviewed"`
- [ ] Implement `CodebaseTools` + `GitHubTools` + `TriageAgent`
- [ ] Implement `FeedbackTriageHandler`
- [ ] Register everything via `AgentsServiceExtensions.AddByteAIAgents()`
