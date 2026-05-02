using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Moderation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/me/drafts")]
[Produces("application/json")]
[Tags("Drafts")]
[Authorize]
[RequireRole("user")]
public sealed class DraftsController(
    IDraftsBusiness draftsBusiness,
    Layer1Moderator layer1,
    ICurrentUserService currentUserService,
    AppDbContext db) : ControllerBase
{
    /// <summary>Save or update a draft. Pass DraftId to update an existing one; omit to create new.</summary>
    [HttpPost]
    [EnableRateLimiting("write")]
    [ProducesResponseType(typeof(ApiResponse<DraftResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<DraftResponse>>> SaveDraft([FromBody] SaveDraftRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var authorId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);

        // Drafts run Layer 1 (deterministic) only — autosaves fire on every keystroke
        // pause, so calling Gemini here would burn quota for content the user hasn't
        // even published yet. The full pipeline (Layer 1 + Gemini) runs at publish
        // time inside ByteService.CreateByteAsync — that's the surface that matters
        // externally. Layer 1 still catches the worst offenders (profanity, PII,
        // shortener-spam, gibberish) on every save.
        var draftText = string.Join("\n",
            new[] { request.Title, request.Body }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (!string.IsNullOrWhiteSpace(draftText))
        {
            var l1 = await layer1.ModerateAsync(draftText, ModerationContext.Byte, ct);
            if (!l1.IsClean && l1.Severity >= ModerationSeverity.High)
            {
                try
                {
                    await FlaggedContentWriter.RecordAsync(
                        db, ModerationContext.Byte, request.DraftId, l1, ct, authorId, draftText);
                }
                catch { /* never block on flag-write failure */ }
                throw new ContentModerationException(l1);
            }
            if (!l1.IsClean && l1.Severity == ModerationSeverity.Medium)
            {
                try
                {
                    await FlaggedContentWriter.RecordAsync(
                        db, ModerationContext.Byte, request.DraftId, l1, ct, authorId, draftText);
                }
                catch { /* never block on flag-write failure */ }
            }
        }

        try
        {
            var draft = await draftsBusiness.SaveDraftAsync(
                supabaseUserId,
                request.DraftId,
                request.Title,
                request.Body,
                request.CodeSnippet,
                request.Language,
                request.Tags ?? [],
                ct);

            return Ok(ApiResponse<DraftResponse>.Success(draft.ToResponse()));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>List the authenticated user's drafts, newest first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<DraftResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<PagedResponse<DraftResponse>>>> GetMyDrafts(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await draftsBusiness.GetMyDraftsAsync(supabaseUserId, page, pageSize, ct);
            var response = new PagedResponse<DraftResponse>(
                result.Items.Select(d => d.ToResponse()).ToList(),
                result.Total, result.Page, result.PageSize);
            return Ok(ApiResponse<PagedResponse<DraftResponse>>.Success(response));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Delete a draft. Only the author may delete their own drafts.</summary>
    [HttpDelete("{draftId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteDraft(Guid draftId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await draftsBusiness.DeleteDraftAsync(supabaseUserId, draftId, ct);
            if (!ok) return NotFound(new { message = $"Draft {draftId} not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
