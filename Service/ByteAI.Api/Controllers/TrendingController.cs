using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Trending")]
[RequireRole("user")]
public sealed class TrendingController(ITrendingBusiness trendingBusiness) : ControllerBase
{
    /// <summary>Record a click on a byte or interview (for trending calculation).</summary>
    [HttpPost("click")]
    [ProducesResponseType(204)]
    public async Task<ActionResult> RecordClick(
        [FromBody] RecordClickRequest request,
        CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId();
        await trendingBusiness.RecordClickAsync(request.ContentId, request.ContentType, clerkId, ct);
        return NoContent();
    }

    /// <summary>Get trending content IDs in past 24h.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<Guid>>), 200)]
    public async Task<ActionResult<ApiResponse<List<Guid>>>> GetTrending(
        [FromQuery] string contentType = "byte",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var ids = await trendingBusiness.GetTrendingAsync(page, pageSize, contentType, ct);
        return Ok(ApiResponse<List<Guid>>.Success(ids));
    }
}

public sealed record RecordClickRequest(Guid ContentId, string ContentType);
