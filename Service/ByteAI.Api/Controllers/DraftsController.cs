using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.Persistence;
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
public sealed class DraftsController(IDraftsBusiness draftsBusiness, IModerationService moderation, AppDbContext db) : ControllerBase
{
    /// <summary>Save or update a draft. Pass DraftId to update an existing one; omit to create new.</summary>
    [HttpPost]
    [EnableRateLimiting("write")]
    [ProducesResponseType(typeof(ApiResponse<DraftResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<DraftResponse>>> SaveDraft([FromBody] SaveDraftRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        // Drafts get the same moderation as full bytes — easier to catch garbage now
        // than at publish time and prevents using drafts as a private TOS workaround.
        var draftText = string.Join("\n",
            new[] { request.Title, request.Body }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (!string.IsNullOrWhiteSpace(draftText))
            await moderation.EnforceAsync(db, draftText, ModerationContext.Byte, contentId: request.DraftId, ct: ct);

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
