using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Reactions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/bytes/{byteId:guid}/reactions")]
[Produces("application/json")]
[Tags("Reactions")]
public sealed class ReactionsController(IMediator mediator) : ControllerBase
{
    /// <summary>Get aggregated reaction counts for a byte.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<ReactionsCountResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<ReactionsCountResponse>>> GetReactions(Guid byteId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetByteReactionsQuery(byteId), ct);
        return Ok(ApiResponse<ReactionsCountResponse>.Success(result.ToResponse()));
    }

    /// <summary>Add a reaction to a byte. <c>type</c> must be one of: <c>like</c>, <c>fire</c>, <c>mind_blown</c>, <c>bookmark</c>.</summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ReactionResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ReactionResponse>>> CreateReaction(
        Guid byteId, [FromBody] CreateReactionRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userId)) return Unauthorized();

        try
        {
            var result = await mediator.Send(new CreateReactionCommand(byteId, userId, request.Type), ct);
            return CreatedAtAction(nameof(GetReactions), new { byteId }, ApiResponse<ReactionResponse>.Success(result.ToResponse()));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Remove the authenticated user's reaction from a byte.</summary>
    [HttpDelete]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteReaction(Guid byteId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userId)) return Unauthorized();

        var ok = await mediator.Send(new DeleteReactionCommand(byteId, userId), ct);
        if (!ok) return NotFound(new { message = "Reaction not found" });
        return Ok(ApiResponse<bool>.Success(true));
    }
}
