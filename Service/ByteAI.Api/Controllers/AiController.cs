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
using System.Text.Json;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireRole("user")]
[Produces("application/json")]
[Tags("AI")]
public sealed class AiController(
    ILlmService llm,
    IEmbeddingService embedding,
    ISearchService search,
    AppDbContext db) : ControllerBase
{
    // suggest-tags endpoint removed — auto-tagging happens in ByteCreatedEventHandler after every post.
    // SuggestTagsAsync on ILlmService is kept because ByteCreatedEventHandler still calls it internally.

    /// <summary>
    /// Ask a tech question answered by Gemini Flash 2.0.
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
        var answer = await llm.AskAsync(request.Question, request.Context, ct);
        return Ok(ApiResponse<AskResponse>.Success(new AskResponse(answer)));
    }

    // ask-about-byte endpoint removed — low value for short-form content (bytes are 150-200 words,
    // faster to read than to ask a question about). Replaced by GET ~/api/bytes/{byteId}/similar.

    /// <summary>
    /// Returns bytes semantically similar to the given byte, using its stored embedding.
    /// Used by the "Show similar bytes" button — navigates to the search screen pre-populated with results.
    /// </summary>
    [HttpGet("~/api/bytes/{byteId:guid}/similar")]
    [EnableRateLimiting("search")]
    [ProducesResponseType(typeof(ApiResponse<List<SimilarByteResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<List<SimilarByteResponse>>>> GetSimilarBytes(
        Guid byteId,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        // Cosine distance > this is treated as "not actually similar" — return empty rather than weak matches.
        const double DistanceThreshold = 0.45;
        // Each tech-stack tag shared with the source nudges a candidate's effective distance down by this much,
        // tie-breaking pure embedding similarity toward the same tech neighborhood.
        const double OverlapBonusPerStack = 0.05;

        var source = await db.Bytes
            .AsNoTracking()
            .Where(b => b.Id == byteId && b.IsActive)
            .Select(b => new
            {
                b.Embedding,
                StackIds = b.ByteTechStacks.Select(bt => bt.TechStackId).ToList(),
            })
            .FirstOrDefaultAsync(ct);

        if (source is null) return NotFound(new { message = $"Byte {byteId} not found" });
        if (source.Embedding is null) return Ok(ApiResponse<List<SimilarByteResponse>>.Success([]));

        // Pull a wider candidate pool via the HNSW index, then re-rank in-memory with overlap bonus + threshold.
        var candidates = await db.Bytes
            .AsNoTracking()
            .Where(b => b.Id != byteId && b.IsActive && b.Embedding != null)
            .OrderBy(b => b.Embedding!.CosineDistance(source.Embedding))
            .Take(50)
            .Select(b => new
            {
                b.Id, b.AuthorId,
                AuthorUsername = b.Author.Username,
                AuthorAvatarUrl = b.Author.AvatarUrl,
                AuthorRoleTitle = b.Author.RoleTitle,
                AuthorCompany = b.Author.Company,
                b.Title, b.Body,
                b.CodeSnippet, b.Language, b.Type, b.CreatedAt,
                Tags = b.ByteTechStacks.Select(bt => bt.TechStack.Name).ToList(),
                StackIds = b.ByteTechStacks.Select(bt => bt.TechStackId).ToList(),
                Distance = b.Embedding!.CosineDistance(source.Embedding),
            })
            .ToListAsync(ct);

        var sourceStackIds = source.StackIds;
        var similar = candidates
            .Where(c => c.Distance < DistanceThreshold)
            .Select(c => new
            {
                Candidate = c,
                Adjusted = c.Distance - OverlapBonusPerStack * c.StackIds.Intersect(sourceStackIds).Count(),
            })
            .OrderBy(x => x.Adjusted)
            .Take(Math.Min(limit, 20))
            .Select(x => new SimilarByteResponse(
                x.Candidate.Id, x.Candidate.AuthorId,
                x.Candidate.AuthorUsername, x.Candidate.AuthorAvatarUrl,
                x.Candidate.AuthorRoleTitle, x.Candidate.AuthorCompany,
                x.Candidate.Title, x.Candidate.Body,
                x.Candidate.CodeSnippet, x.Candidate.Language, x.Candidate.Type, x.Candidate.CreatedAt,
                x.Candidate.Tags))
            .ToList();

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

        var answer = await llm.RagAnswerAsync(request.Question, passages, ct);

        return Ok(ApiResponse<SearchAskResponse>.Success(new SearchAskResponse(answer, sources)));
    }

    /// <summary>
    /// Streaming variant of <see cref="SearchAsk"/>. Returns NDJSON: one JSON object per line.
    /// Line shapes: { "type": "sources", "sources": [...] } (always first),
    ///              { "type": "chunk",  "text": "..." }     (zero or more, in order),
    ///              { "type": "done"  }                     (always last).
    /// Frontend reads + dispatches each line; first chunk arrives in ~400ms instead of waiting
    /// for the full Gemini round-trip.
    /// </summary>
    [HttpPost("search-ask-stream")]
    [EnableRateLimiting("ai")]
    [RequireFeatureFlag("ai-search-ask")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task SearchAskStream(
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

        Response.ContentType = "application/x-ndjson";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no"; // disable nginx/proxy buffering

        await WriteLineAsync(new { type = "sources", sources }, ct);

        if (passages.Count == 0)
        {
            await WriteLineAsync(new { type = "chunk", text = "No relevant content found in ByteAI for that question. Try posting bytes on this topic first!" }, ct);
            await WriteLineAsync(new { type = "done" }, ct);
            return;
        }

        await foreach (var chunk in llm.RagAnswerStreamAsync(request.Question, passages, ct))
            await WriteLineAsync(new { type = "chunk", text = chunk }, ct);

        await WriteLineAsync(new { type = "done" }, ct);
    }

    private async Task WriteLineAsync(object payload, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await Response.WriteAsync(json + "\n", ct);
        await Response.Body.FlushAsync(ct);
    }

    /// <summary>
    /// Format code using Gemini. Used for languages not supported by Prettier (C#, Go, Java, Python, etc.).
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
        var formatted = await llm.FormatCodeAsync(request.Code, request.Language, ct);
        if (formatted is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiError("service_unavailable", "AI formatting service is currently unavailable."));
        return Ok(ApiResponse<FormatCodeResponse>.Success(new FormatCodeResponse(formatted)));
    }
}
