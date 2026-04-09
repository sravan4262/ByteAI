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
public sealed class AiController(IGroqService groq) : ControllerBase
{
    /// <summary>POST /api/ai/suggest-tags</summary>
    [HttpPost("suggest-tags")]
    public async Task<ActionResult<ApiResponse<SuggestTagsResponse>>> SuggestTags(
        [FromBody] SuggestTagsRequest request,
        CancellationToken ct)
    {
        var tags = await groq.SuggestTagsAsync(request.Title, request.Body, request.CodeSnippet, ct);
        return Ok(ApiResponse<SuggestTagsResponse>.Success(new SuggestTagsResponse(tags)));
    }

    /// <summary>POST /api/ai/ask</summary>
    [HttpPost("ask")]
    public async Task<ActionResult<ApiResponse<AskResponse>>> Ask(
        [FromBody] AskRequest request,
        CancellationToken ct)
    {
        var answer = await groq.AskAsync(request.Question, request.Context, ct);
        return Ok(ApiResponse<AskResponse>.Success(new AskResponse(answer)));
    }
}
