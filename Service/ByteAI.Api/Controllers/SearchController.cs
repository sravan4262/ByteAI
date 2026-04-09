using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Search;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SearchController(IMediator mediator) : ControllerBase
{
    /// <summary>GET /api/search?q=react+performance&amp;limit=20</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ViewModels.SearchResponse>>>> Search(
        [FromQuery] string q,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new ApiError("INVALID_QUERY", "Query parameter 'q' is required."));

        var clerkId = HttpContext.GetClerkUserId();
        Guid? userId = clerkId is not null && Guid.TryParse(clerkId, out var uid) ? uid : null;

        var results = await mediator.Send(
            new SearchQuery(q, Math.Min(limit, 50), userId), ct);

        return Ok(ApiResponse<List<ViewModels.SearchResponse>>.Success(
            results.Select(b => b.ToSearchResponse()).ToList()));
    }
}
