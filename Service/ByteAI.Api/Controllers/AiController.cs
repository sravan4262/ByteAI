using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Services.AI;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
[Tags("AI")]
public sealed class AiController(IGroqService groq) : ControllerBase
{
    /// <summary>
    /// Suggest up to 5 tags for a byte using Groq Llama 3.3 70B.
    /// Returns an empty list if the Groq API key is not configured.
    /// </summary>
    [HttpPost("suggest-tags")]
    [ProducesResponseType(typeof(ApiResponse<SuggestTagsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<SuggestTagsResponse>>> SuggestTags(
        [FromBody] SuggestTagsRequest request,
        CancellationToken ct)
    {
        var tags = await groq.SuggestTagsAsync(request.Title, request.Body, request.CodeSnippet, ct);
        return Ok(ApiResponse<SuggestTagsResponse>.Success(new SuggestTagsResponse(tags)));
    }

    /// <summary>
    /// Ask a tech question answered by Groq Llama 3.3 70B.
    /// Optionally pass a <c>context</c> string (e.g. the byte body) for RAG-style answers.
    /// </summary>
    [HttpPost("ask")]
    [ProducesResponseType(typeof(ApiResponse<AskResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<AskResponse>>> Ask(
        [FromBody] AskRequest request,
        CancellationToken ct)
    {
        var answer = await groq.AskAsync(request.Question, request.Context, ct);
        return Ok(ApiResponse<AskResponse>.Success(new AskResponse(answer)));
    }
}
