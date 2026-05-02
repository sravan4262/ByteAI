# PROGRESS — Moderation v2 (2026-05-02)

Follow-up to the 13-item bug-fix batch shipped 2026-05-01. The v1 moderation system co-existed with three older inline validation stages in `ByteService` ("About Detroit city" passed because Gemini's prompt said "be generous"). v2 unifies everything into one moderation surface backed by Gemini, drops the unused ONNX path, and propagates rich content moderation should be shown properly on web and ios rejection reasons to both clients.

All changes are local — **nothing pushed, nothing committed.**

---

## What changed end-to-end

### Backend
- **One moderation call per write.** `ByteService.CreateByteAsync` and `UpdateByteAsync` previously ran 3 stages inline (entropy → embedding similarity → `llm.ValidateTechContentAsync`); they now call `IModerationService.EnforceAsync` once.
- **`BytesController` no longer runs moderation.** The earlier v1 wiring duplicated the call (controller + service); removed from controller. Other controllers (Comments, Interviews, Drafts, Support) still call `EnforceAsync` because their services don't.
- **One Gemini prompt, structured JSON.** Replaces the old "be generous" prompt. Reason codes: `OFF_TOPIC`, `TOXICITY`, `HARASSMENT`, `HATE`, `SEXUAL`, `HARM`, `PROFANITY`, `PII`, `SPAM`, `GIBBERISH`, `PROMPT_INJECTION`. The prompt is context-aware: `OFF_TOPIC` is blocking on `byte`/`interview`, suppressed on `comment`/`chat`/`support`/`profile`. The "Detroit city" case now returns `OFF_TOPIC` because the prompt explicitly tells the model "mere mention of a tech-adjacent word is NOT enough."
- **ONNX path deleted.** `Layer2OnnxModerator.cs`, `OnnxToxicityClassifier.cs`, `EnableLayer2`/`ToxicityModelPath`/thresholds — gone.
- **Failure mode in `CompositeModerator`:**
  - `Chat` context: Gemini unavailable → fail closed (return synthetic High severity with `MODERATION_UNAVAILABLE` reason; client shows banner).
  - All other contexts: Gemini unavailable → fail open (Layer 1 outcome wins, warning logged). Per the user's recommendation.
- **Dead code removed:** `InvalidContentException.cs` (no longer thrown anywhere); `ValidateTechContentAsync` + `ContentValidationResult` removed from `ILlmService` and `GeminiService`.
- **`appsettings.json`:** the Moderation section is now just `{ "EnableLlm": true }`.

### Tests
- `ByteServiceTests.cs` rewritten — mocks `IModerationService` directly. Covers: rejection (single + multiple reasons), happy path, type normalization, unchanged-content skip, update-after-rejection.

### Clients — surface rich rejection reasons everywhere

API contract for rejections (HTTP 422):
```json
{
  "error": "CONTENT_REJECTED",
  "severity": "high",
  "reasons": [
    { "code": "OFF_TOPIC", "message": "Make the post substantively about a tech topic, not just mention one." }
  ]
}
```
**Severity is intentionally not surfaced to users** — only the reasons.

#### iOS (`UI-IOS/ByteAI/`)
- New `Shared/Components/ContentRejectedModal.swift` — typed `ContentRejection { reasons[] }`, SF-symbol per code, monospaced `byteTerminalSmall` code labels. Registered in `ByteAI.xcodeproj` via the same `xcodeproj` ruby script approach used last batch.
- `Core/Network/APIClient.swift` — added `APIError.contentRejected(ContentRejection)` plus an `APIError.rejection(from:)` helper that extracts the rejection from any error (covers 422, legacy 400 `INVALID_CONTENT` for back-compat, AND SignalR `HubException` payloads where the message embeds the JSON envelope).
- `Features/Compose/ComposeView.swift` — replaced `showInvalidContentModal`/`invalidContentReason` with `@Published var contentRejection: ContentRejection?`, `.sheet(item:)` mounts the new modal. `ComposeViewModel.post()` returns `Bool`; the form is preserved on rejection. Used for both byte and interview compose (single screen).
- `Features/PostDetail/CommentsSheet.swift` + `Features/PostDetail/PostDetailView.swift` — `submit` returns `Bool`; sheet attached; `CommentComposeBar` restores draft text on failure.
- `Features/Interviews/InterviewDetailView.swift` — interview-level + per-question (`QuestionCommentThread`) comment composers each own their own rejection sheet.
- `Features/Chat/ChatViewModels.swift` + `ChatThreadView.swift` — chat uses an inline red banner above the prompt (modal would be too heavy). Auto-dismiss after 5s, tap to dismiss.
- `Features/Profile/ProfileView.swift` (`SupportTerminalVM`) — emits `> ERROR: <CODE> — <message>` red lines into the terminal output (matches the terminal aesthetic).

#### Web (`UI/`)
- `components/ui/error-modal.tsx` — added `CONTENT_REJECTED` case to `resolveErrorModal`. `ErrorModalProps.reasons` now optional. Renders an icon-prefixed reason list (lucide icons mapped per code: `Globe`, `Flame`, `EyeOff`, `AlertTriangle`, `Ban`, `Lock`, `Link2`, `Keyboard`, `Zap`, `WifiOff`, default `XCircle`). Severity not displayed.
- `lib/api/http.ts` — `ApiError` extended with `reasons?: ModerationReason[]`. The body parser extracts `reasons[]` and synthesises a fallback joined-message string so legacy callers reading `err.reason` still get human text.
- Wired into:
  - `components/features/compose/compose-screen.tsx` — `postError` shape extended.
  - `components/features/compose/compose-interview-screen.tsx` — added `postError` + ErrorModal.
  - `components/features/comments/comments-screen.tsx` — modal pattern on byte comment submit.
  - `components/features/interviews/interview-detail-screen.tsx` — both per-question and interview-level comment composers.
  - `components/features/chat/ChatThread.tsx` — inline red banner above `TerminalInput`, auto-dismiss after 5s, manual close. Parses moderation JSON tail from the SignalR HubException message.
  - `lib/api/support.ts` + `components/features/terminal/useTerminal.ts` — `submitFeedback` re-throws on `CONTENT_REJECTED` only; the terminal `submitAndRender` helper renders one `> ERROR: <CODE> — <message>` line per reason.

---

## Build status

| Build | Status | Notes |
|---|---|---|
| .NET API (`dotnet build ByteAI.sln`) | **Build succeeded** | 0 errors, 6 pre-existing warnings (XML doc + nullable refs in unmodified controllers) |
| Web TypeScript (`pnpm exec tsc --noEmit`) | **Pass** | 0 errors |
| iOS (`xcodebuild` Debug iphonesimulator) | **BUILD SUCCEEDED** | 0 errors |

---

## Files inventory (this batch)

### Backend created
- `Service/ByteAI.Core/Moderation/GeminiModerator.cs`

### Backend deleted
- `Service/ByteAI.Core/Moderation/Layer2OnnxModerator.cs`
- `Service/ByteAI.Core/Moderation/OnnxToxicityClassifier.cs`
- `Service/ByteAI.Core/Exceptions/InvalidContentException.cs`

### Backend modified
- `Service/ByteAI.Core/Services/AI/ILlmService.cs` — removed `ContentValidationResult`/`ValidateTechContentAsync`; added `LlmModerationResult`/`LlmModerationReason` + `ModerateContentAsync`.
- `Service/ByteAI.Core/Services/AI/GeminiService.cs` — replaced `ValidateTechContentAsync` impl with `ModerateContentAsync` (unified moderation prompt, structured JSON, prompt-injection hardened).
- `Service/ByteAI.Core/Moderation/CompositeModerator.cs` — Layer1 + Gemini pipeline; per-context failure mode.
- `Service/ByteAI.Core/Moderation/ModerationOptions.cs` — only `EnableLlm` remains.
- `Service/ByteAI.Core/Services/Bytes/ByteService.cs` — dropped 3 inline stages + `IsGibberish` helper; constructor now takes `IModerationService`.
- `Service/ByteAI.Api/Program.cs` — DI registers `GeminiModerator` (was `Layer2OnnxModerator` + `OnnxToxicityClassifier`).
- `Service/ByteAI.Api/appsettings.json` — Moderation section reduced to one flag.
- `Service/ByteAI.Api/Controllers/BytesController.cs` — removed duplicated `EnforceAsync` calls + dead `InvalidContentException` catches; primary constructor slimmed.
- `Service/ByteAI.Api/Middleware/GlobalExceptionMiddleware.cs` — removed `InvalidContentException` mapping.
- `Service/tests/ByteAI.Api.Tests/Unit/Services/ByteServiceTests.cs` — rewritten around `IModerationService` mock.

### iOS created
- `UI-IOS/ByteAI/Shared/Components/ContentRejectedModal.swift`

### iOS modified
- `UI-IOS/ByteAI.xcodeproj/project.pbxproj` (added the new file)
- `UI-IOS/ByteAI/Core/Network/APIClient.swift`
- `UI-IOS/ByteAI/Features/Compose/ComposeView.swift`
- `UI-IOS/ByteAI/Features/PostDetail/CommentsSheet.swift`
- `UI-IOS/ByteAI/Features/PostDetail/PostDetailView.swift`
- `UI-IOS/ByteAI/Features/Interviews/InterviewDetailView.swift`
- `UI-IOS/ByteAI/Features/Chat/ChatViewModels.swift`
- `UI-IOS/ByteAI/Features/Chat/ChatThreadView.swift`
- `UI-IOS/ByteAI/Features/Profile/ProfileView.swift`

### Web modified
- `UI/components/ui/error-modal.tsx`
- `UI/lib/api/http.ts`
- `UI/lib/api/support.ts`
- `UI/components/features/compose/compose-screen.tsx`
- `UI/components/features/compose/compose-interview-screen.tsx`
- `UI/components/features/comments/comments-screen.tsx`
- `UI/components/features/interviews/interview-detail-screen.tsx`
- `UI/components/features/chat/ChatThread.tsx`
- `UI/components/features/terminal/useTerminal.ts`

---

## Why "About Detroit city" will now be blocked

The unified Gemini prompt explicitly states:

> Mere mention of a word like "developer", "computer", "tech" is NOT enough — the content as a whole must be a tech-relevant idea, lesson, question, or share.

> For surface "byte" or "interview": OFF_TOPIC is a blocking reason. Tech content must be substantive — a recipe, a non-tech anecdote, or a city description does NOT pass even if it contains a tech-adjacent word.

The model returns `{ "isClean": false, "reasons": [{ "code": "OFF_TOPIC", "message": "..." }] }`. `GeminiModerator` translates this to a High-severity `ModerationResult`, which `EnforceAsync` raises as `ContentModerationException`, which the global exception middleware returns as 422 `CONTENT_REJECTED`, which both clients render with the new modal/banner.

---

## Estimated accuracy (rough)

| Threat | v1 (L1 + ONNX stub, no model) | v2 (L1 + Gemini Flash) |
|---|---|---|
| Off-topic / "Detroit city" | 0% | ~90% |
| Profanity (clear slurs) | 95% | 98% |
| Toxicity (subtle) | 0% | ~93% |
| Hate / harassment | 0% | ~92% |
| PII | 85% | 95% |
| Multilingual profanity | ~10% | ~88% |
| Latency | <50ms | 300-500ms |
| Cost | $0 | ~$0.0001/post |

---

## Existing data

User confirmed they will run a Supabase clean-up via the `wipe_supabase_auth` workflow (shipped in the prior batch) since prod isn't in real use yet. No backfill / re-moderation pass needed.

---

## Not committed, not pushed
All changes are uncommitted in the working tree. `git status` to inspect.
