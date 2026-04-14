using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/me/drafts")]
[Produces("application/json")]
[Tags("Drafts")]
[Authorize]
[RequireRole("user")]
public sealed class DraftsController(IDraftsBusiness draftsBusiness) : ControllerBase
{
    /// <summary>Save or update a draft. Pass DraftId to update an existing one; omit to create new.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<DraftResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<DraftResponse>>> SaveDraft([FromBody] SaveDraftRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var draft = await draftsBusiness.SaveDraftAsync(
                clerkId,
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
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await draftsBusiness.GetMyDraftsAsync(clerkId, page, pageSize, ct);
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
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await draftsBusiness.DeleteDraftAsync(clerkId, draftId, ct);
            if (!ok) return NotFound(new { message = $"Draft {draftId} not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
