using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Search")]
[RequireRole("user")]
public sealed class SearchController(ISearchBusiness searchBusiness) : ControllerBase
{
    /// <summary>
    /// Search for content by type.
    /// </summary>
    /// <param name="q">Search query string.</param>
    /// <param name="type">Content type: "bytes" | "interviews" | "people".</param>
    /// <param name="limit">Maximum results to return (max 50).</param>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<SearchResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<UserSearchResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> Search(
        [FromQuery] string q,
        [FromQuery] string type = "bytes",
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new ApiError("INVALID_QUERY", "Query parameter 'q' is required."));

        var normalizedType = type.ToLowerInvariant();
        var validTypes = new[] { "bytes", "interviews", "people" };
        if (!validTypes.Contains(normalizedType))
            return BadRequest(new ApiError("INVALID_TYPE", "type must be one of: bytes, interviews, people."));

        if (normalizedType == "people")
        {
            var users = await searchBusiness.SearchPeopleAsync(q, Math.Min(limit, 50), ct);
            return Ok(ApiResponse<List<UserSearchResponse>>.Success(
                users.Select(u => new UserSearchResponse(u.Id, u.Username, u.DisplayName ?? u.Username, u.Bio, u.AvatarUrl, u.IsVerified)).ToList()));
        }

        var results = await searchBusiness.SearchContentAsync(q, normalizedType, Math.Min(limit, 50), ct);
        return Ok(ApiResponse<List<SearchResponse>>.Success(
            results.Select(r => r.ToSearchResponse()).ToList()));
    }
}
