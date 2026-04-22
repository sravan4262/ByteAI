using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Search;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

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
    // suggest-tags endpoint removed — auto-tagging happens in ByteCreatedEventHandler after every post.
    // SuggestTagsAsync on IGroqService is kept because ByteCreatedEventHandler still calls it internally.

    /// <summary>
    /// Ask a tech question answered by Groq Llama 3.3 70B.
    /// Optionally pass a <c>context</c> string (e.g. the byte body) for RAG-style answers.
    /// </summary>
    [HttpPost("ask")]
    [EnableRateLimiting("ai")]
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

    // ask-about-byte endpoint removed — low value for short-form content (bytes are 150-200 words,
    // faster to read than to ask a question about). Replaced by GET ~/api/bytes/{byteId}/similar.

    /// <summary>
    /// Returns bytes semantically similar to the given byte, using its stored embedding.
    /// Used by the "Show similar bytes" button — navigates to the search screen pre-populated with results.
    /// </summary>
    [HttpGet("~/api/bytes/{byteId:guid}/similar")]
    [ProducesResponseType(typeof(ApiResponse<List<SimilarByteResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<List<SimilarByteResponse>>>> GetSimilarBytes(
        Guid byteId,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        var source = await db.Bytes
            .AsNoTracking()
            .Where(b => b.Id == byteId && b.IsActive)
            .Select(b => new { b.Embedding })
            .FirstOrDefaultAsync(ct);

        if (source is null) return NotFound(new { message = $"Byte {byteId} not found" });
        if (source.Embedding is null) return Ok(ApiResponse<List<SimilarByteResponse>>.Success([]));

        var similar = await db.Bytes
            .AsNoTracking()
            .Where(b => b.Id != byteId && b.IsActive && b.Embedding != null)
            .OrderBy(b => b.Embedding!.CosineDistance(source.Embedding))
            .Take(Math.Min(limit, 20))
            .Select(b => new SimilarByteResponse(
                b.Id, b.AuthorId, b.Author.Username, b.Title, b.Body,
                b.CodeSnippet, b.Language, b.Type, b.CreatedAt,
                b.ByteTechStacks.Select(bt => bt.TechStack.Name).ToList(),
                b.UserLikes.Count,
                b.Comments.Count))
            .ToListAsync(ct);

        return Ok(ApiResponse<List<SimilarByteResponse>>.Success(similar));
    }

    /// <summary>
    /// Option B/C — Semantic search + RAG answer.
    /// Pass <c>type=bytes</c> to search bytes, <c>type=interviews</c> to search interviews,
    /// or omit <c>type</c> to search both and blend the top passages.
    /// Returns the synthesised answer plus the source items used.
    /// </summary>
    [HttpPost("search-ask")]
    [EnableRateLimiting("ai")]
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
    [EnableRateLimiting("ai")]
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
