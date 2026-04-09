using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Search;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Search")]
public sealed class SearchController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Hybrid full-text + semantic search over bytes.
    /// Combines PostgreSQL full-text search (tsvector) and pgvector cosine similarity,
    /// merged via Reciprocal Rank Fusion (k=60).
    /// </summary>
    /// <param name="q">Search query string.</param>
    /// <param name="limit">Maximum results to return (max 50).</param>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ViewModels.SearchResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
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
