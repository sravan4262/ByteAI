using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Bytes")]
public sealed class BytesController(IBytesBusiness bytesBusiness) : ControllerBase
{
    /// <summary>List bytes with optional filtering and pagination.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<ByteResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<ByteResponse>>>> GetBytes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? authorId = null,
        [FromQuery] string sort = "recent",
        CancellationToken ct = default)
    {
        var result = await bytesBusiness.GetBytesAsync(page, pageSize, authorId, sort, ct);
        var response = new PagedResponse<ByteResponse>(result.Items.Select(b => b.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<ByteResponse>>.Success(response));
    }

    /// <summary>Get a single byte by ID.</summary>
    [HttpGet("{byteId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ByteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ByteResponse>>> GetByteById(Guid byteId, CancellationToken ct)
    {
        var result = await bytesBusiness.GetByteByIdAsync(byteId, ct);
        if (result is null) return NotFound(new { message = $"Byte {byteId} not found" });
        return Ok(ApiResponse<ByteResponse>.Success(result.ToResponse()));
    }

    /// <summary>
    /// Create a new byte or interview.
    /// If the title/body contains interview keywords, the post is automatically
    /// saved to the interviews table instead of bytes.
    /// Requires authentication.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ByteResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateByte([FromBody] CreateByteRequest request, [FromQuery] bool force = false, CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await bytesBusiness.CreateByteAsync(clerkId, request.Title, request.Body, request.CodeSnippet, request.Language, request.Type, ct, force);
            return CreatedAtAction(nameof(GetByteById), new { byteId = result.Id },
                ApiResponse<object>.Success(new { result.Id, result.AuthorId, result.Title, result.Body, result.Type, result.CreatedAt }));
        }
        catch (InvalidContentException ex)
        {
            return BadRequest(new { error = "INVALID_CONTENT", reason = ex.Reason });
        }
        catch (DuplicateContentException ex)
        {
            return Conflict(new
            {
                error = "DUPLICATE_CONTENT",
                existingId = ex.ExistingId,
                existingTitle = ex.ExistingTitle,
                similarity = Math.Round(ex.Similarity * 100, 1)
            });
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Update a byte. Only the author may update their own bytes.</summary>
    [HttpPut("{byteId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ByteResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<ByteResponse>>> UpdateByte(Guid byteId, [FromBody] UpdateByteRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await bytesBusiness.UpdateByteAsync(clerkId, byteId, request.Title, request.Body, request.CodeSnippet, request.Language, ct);
            return Ok(ApiResponse<ByteResponse>.Success(result.ToResponse()));
        }
        catch (InvalidContentException ex) { return BadRequest(new { error = "INVALID_CONTENT", reason = ex.Reason }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(new { message = $"Byte {byteId} not found" }); }
    }

    /// <summary>List the authenticated user's own active bytes (for the profile "my posts" view).</summary>
    [HttpGet("~/api/me/bytes")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<ByteResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<ByteResponse>>>> GetMyBytes(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        var result = await bytesBusiness.GetMyBytesAsync(clerkId, page, pageSize, ct);
        var response = new PagedResponse<ByteResponse>(result.Items.Select(b => b.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<ByteResponse>>.Success(response));
    }

    /// <summary>Delete a byte. Only the author may delete their own bytes.</summary>
    [HttpDelete("{byteId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteByte(Guid byteId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await bytesBusiness.DeleteByteAsync(clerkId, byteId, ct);
            if (!ok) return NotFound(new { message = $"Byte {byteId} not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
