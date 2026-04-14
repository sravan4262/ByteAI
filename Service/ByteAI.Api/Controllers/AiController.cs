using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Search;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireRole("user")]
[Produces("application/json")]
[Tags("AI")]
public sealed class AiController(
    IGroqService groq,
    IEmbeddingService embedding,
    ISearchService search,
    AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Suggest up to 5 tags for a byte using Groq Llama 3.3 70B.
    /// Returns an empty list if the Groq API key is not configured.
    /// </summary>
    [HttpPost("suggest-tags")]
    [RequireFeatureFlag("ai-suggest-tags")]
    [ProducesResponseType(typeof(ApiResponse<SuggestTagsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<SuggestTagsResponse>>> SuggestTags(
        [FromBody] SuggestTagsRequest request,
        CancellationToken ct)
    {
        var allowedTags = await db.TechStacks.Select(t => t.Name).ToListAsync(ct);
        var tags = await groq.SuggestTagsAsync(request.Title, request.Body, request.CodeSnippet, allowedTags, ct);
        return Ok(ApiResponse<SuggestTagsResponse>.Success(new SuggestTagsResponse(tags)));
    }

    /// <summary>
    /// Ask a tech question answered by Groq Llama 3.3 70B.
    /// Optionally pass a <c>context</c> string (e.g. the byte body) for RAG-style answers.
    /// </summary>
    [HttpPost("ask")]
    [RequireFeatureFlag("ai-ask")]
    [ProducesResponseType(typeof(ApiResponse<AskResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<AskResponse>>> Ask(
        [FromBody] AskRequest request,
        CancellationToken ct)
    {
        var answer = await groq.AskAsync(request.Question, request.Context, ct);
        return Ok(ApiResponse<AskResponse>.Success(new AskResponse(answer)));
    }

    /// <summary>
    /// Option A — Ask a question grounded in a specific byte's content.
    /// The byte body becomes the sole RAG context passage.
    /// </summary>
    [HttpPost("~/api/bytes/{byteId:guid}/ask")]
    [RequireFeatureFlag("ai-ask")]
    [ProducesResponseType(typeof(ApiResponse<ByteAskResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<ByteAskResponse>>> AskAboutByte(
        Guid byteId,
        [FromBody] ByteAskRequest request,
        CancellationToken ct)
    {
        var b = await db.Bytes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == byteId, ct);
        if (b is null) return NotFound(new { message = $"Byte {byteId} not found" });

        var passage = new RagPassage(b.Title, b.Body, b.Id.ToString());
        var answer = await groq.RagAnswerAsync(request.Question, [passage], ct);

        return Ok(ApiResponse<ByteAskResponse>.Success(new ByteAskResponse(answer, b.Id.ToString(), b.Title)));
    }

    /// <summary>
    /// Option B/C — Semantic search + RAG answer.
    /// Pass <c>type=bytes</c> to search bytes, <c>type=interviews</c> to search interviews,
    /// or omit <c>type</c> to search both and blend the top passages.
    /// Returns the synthesised answer plus the source items used.
    /// </summary>
    [HttpPost("search-ask")]
    [RequireFeatureFlag("ai-search-ask")]
    [ProducesResponseType(typeof(ApiResponse<SearchAskResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<SearchAskResponse>>> SearchAsk(
        [FromBody] SearchAskRequest request,
        CancellationToken ct)
    {
        var queryVec = await embedding.EmbedQueryAsVectorAsync(request.Question, ct);

        var passages = new List<RagPassage>();
        var sources = new List<SearchAskSource>();

        var type = request.Type?.ToLowerInvariant();

        if (type is null or "bytes")
        {
            var bytes = await search.SearchBytesAsync(request.Question, queryVec, 5, ct);
            foreach (var b in bytes)
            {
                passages.Add(new RagPassage(b.Title, b.Body, b.Id.ToString()));
                sources.Add(new SearchAskSource(b.Id.ToString(), b.Title, "byte"));
            }
        }

        if (type is null or "interviews")
        {
            var interviews = await search.SearchInterviewsAsync(request.Question, queryVec, 5, ct);
            foreach (var iv in interviews)
            {
                passages.Add(new RagPassage(iv.Title, iv.Body, iv.Id.ToString()));
                sources.Add(new SearchAskSource(iv.Id.ToString(), iv.Title, "interview"));
            }
        }

        if (passages.Count == 0)
            return Ok(ApiResponse<SearchAskResponse>.Success(
                new SearchAskResponse("No relevant content found in ByteAI for that question. Try posting bytes on this topic first!", [])));

        var answer = await groq.RagAnswerAsync(request.Question, passages, ct);

        return Ok(ApiResponse<SearchAskResponse>.Success(new SearchAskResponse(answer, sources)));
    }

    /// <summary>
    /// Format code using Groq. Used for languages not supported by Prettier (C#, Go, Java, Python, etc.).
    /// </summary>
    [HttpPost("format-code")]
    [RequireFeatureFlag("ai-format-code")]
    [ProducesResponseType(typeof(ApiResponse<FormatCodeResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<FormatCodeResponse>>> FormatCode(
        [FromBody] FormatCodeRequest request,
        CancellationToken ct)
    {
        var formatted = await groq.FormatCodeAsync(request.Code, request.Language, ct);
        return Ok(ApiResponse<FormatCodeResponse>.Success(new FormatCodeResponse(formatted)));
    }
}
