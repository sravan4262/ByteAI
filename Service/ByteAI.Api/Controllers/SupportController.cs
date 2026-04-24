using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/support")]
[Produces("application/json")]
[Tags("Support")]
[Authorize]
public sealed class SupportController(ISupportBusiness supportBusiness) : ControllerBase
{
    /// <summary>Submit feedback about the app. Rate limited to 5 req/min per user.</summary>
    [HttpPost("feedback")]
    [EnableRateLimiting("support")]
    [ProducesResponseType(typeof(ApiResponse<FeedbackResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<FeedbackResponse>>> SubmitFeedback(
        [FromBody] SubmitFeedbackRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var feedback = await supportBusiness.SubmitFeedbackAsync(
                supabaseUserId, request.Type, request.Message, request.PageContext, ct);

            return StatusCode(StatusCodes.Status201Created,
                ApiResponse<FeedbackResponse>.Success(feedback.ToResponse()));
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Get the last 5 feedback submissions by the authenticated user.</summary>
    [HttpGet("feedback/history")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<FeedbackResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<FeedbackResponse>>>> GetMyHistory(CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var history = await supportBusiness.GetMyFeedbackHistoryAsync(supabaseUserId, ct);
        return Ok(ApiResponse<IReadOnlyList<FeedbackResponse>>.Success(history.Select(f => f.ToResponse()).ToList()));
    }
}

internal static class FeedbackMappers
{
    internal static FeedbackResponse ToResponse(this ByteAI.Core.Entities.Feedback f) => new(
        f.Id, f.Type, f.Message, f.PageContext, f.Status, f.AdminNote, f.CreatedAt);

    internal static AdminFeedbackResponse ToAdminResponse(this ByteAI.Core.Entities.Feedback f, string? username = null) => new(
        f.Id, f.Type, f.Message, f.PageContext, f.Status, f.AdminNote,
        username, f.UserId, f.CreatedAt, f.UpdatedAt);
}
