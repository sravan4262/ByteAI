using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Bytes")]
public sealed class BytesController(IMediator mediator) : ControllerBase
{
    /// <summary>List bytes with optional filtering and pagination.</summary>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Items per page (max 100).</param>
    /// <param name="authorId">Filter by author GUID.</param>
    /// <param name="tags">Comma-separated tag filter, e.g. <c>csharp,dotnet</c>.</param>
    /// <param name="sort">Sort order: <c>recent</c> | <c>trending</c> | <c>top</c>.</param>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<ByteResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<ByteResponse>>>> GetBytes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? authorId = null,
        [FromQuery] string? tags = null,
        [FromQuery] string sort = "recent",
        CancellationToken ct = default)
    {
        var tagList = string.IsNullOrEmpty(tags) ? null : tags.Split(',').ToList();
        var result = await mediator.Send(new GetBytesQuery(new PaginationParams(page, Math.Min(pageSize, 100)), authorId, tagList, sort), ct);
        var response = new PagedResponse<ByteResponse>(result.Items.Select(b => b.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<ByteResponse>>.Success(response));
    }

    /// <summary>Get a single byte by ID.</summary>
    [HttpGet("{byteId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ByteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ByteResponse>>> GetByteById(Guid byteId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetByteByIdQuery(byteId), ct);
        if (result is null) return NotFound(new { message = $"Byte {byteId} not found" });
        return Ok(ApiResponse<ByteResponse>.Success(result.ToResponse()));
    }

    /// <summary>Create a new byte. Requires authentication.</summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ByteResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<ByteResponse>>> CreateByte([FromBody] CreateByteRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var authorId)) return Unauthorized();

        var result = await mediator.Send(request.ToCommand(authorId), ct);
        return CreatedAtAction(nameof(GetByteById), new { byteId = result.Id }, ApiResponse<ByteResponse>.Success(result.ToResponse()));
    }

    /// <summary>Update a byte. Only the author may update their own bytes.</summary>
    [HttpPut("{byteId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ByteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ByteResponse>>> UpdateByte(Guid byteId, [FromBody] UpdateByteRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var authorId)) return Unauthorized();

        try
        {
            var result = await mediator.Send(request.ToCommand(byteId, authorId), ct);
            return Ok(ApiResponse<ByteResponse>.Success(result.ToResponse()));
        }
        catch (KeyNotFoundException) { return NotFound(new { message = $"Byte {byteId} not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    /// <summary>Delete a byte. Only the author may delete their own bytes.</summary>
    [HttpDelete("{byteId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteByte(Guid byteId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var authorId)) return Unauthorized();

        try
        {
            var ok = await mediator.Send(new DeleteByteCommand(byteId, authorId), ct);
            if (!ok) return NotFound(new { message = $"Byte {byteId} not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
