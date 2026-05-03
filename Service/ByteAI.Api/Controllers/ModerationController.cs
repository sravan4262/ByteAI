using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

/// <summary>
/// Endpoints exposed to authenticated users for reporting offensive or off-topic
/// content. Reads of flagged_content are deliberately excluded — that surface is
/// admin-only and lives elsewhere.
/// </summary>
[ApiController]
[Route("api/moderation")]
[Produces("application/json")]
[Tags("Moderation")]
[Authorize]
[RequireRole("user")]
public sealed class ModerationController(AppDbContext db, ICurrentUserService currentUserService) : ControllerBase
{
    private static readonly HashSet<string> AllowedContentTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "byte", "comment", "interview_comment", "interview_question_comment",
            "interview", "chat", "support", "profile"
        };

    /// <summary>
    /// File a user report against a piece of content. Stored in moderation.flagged_content
    /// with severity='medium', status='open' and reason_code='USER_REPORT'.
    /// </summary>
    [HttpPost("reports")]
    [EnableRateLimiting("social")]
    [ProducesResponseType(typeof(ApiResponse<ReportContentResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ReportContent(
        [FromBody] ReportContentRequest request,
        CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        if (string.IsNullOrWhiteSpace(request.ContentType) || !AllowedContentTypes.Contains(request.ContentType))
            return BadRequest(new { error = "INVALID_CONTENT_TYPE" });

        if (request.ContentId == Guid.Empty)
            return BadRequest(new { error = "INVALID_CONTENT_ID" });

        var reporterId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (reporterId is null) return Unauthorized();

        var row = new FlaggedContent
        {
            ContentType = request.ContentType.ToLowerInvariant(),
            ContentId = request.ContentId,
            ReporterUserId = reporterId,
            ReasonCode = "USER_REPORT",
            ReasonMessage = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Severity = "medium",
            Status = "open",
            CreatedAt = DateTime.UtcNow,
        };

        db.Set<FlaggedContent>().Add(row);
        await db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<ReportContentResponse>.Success(new ReportContentResponse(row.Id, row.Status)));
    }
}

public sealed record ReportContentRequest(string ContentType, Guid ContentId, string ReasonCode, string? Message);

public sealed record ReportContentResponse(Guid Id, string Status);
