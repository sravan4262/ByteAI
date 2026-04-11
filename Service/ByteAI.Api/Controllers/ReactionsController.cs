using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/bytes/{byteId:guid}/reactions")]
[Produces("application/json")]
[Tags("Reactions")]
public sealed class ReactionsController(IReactionsBusiness reactionsBusiness) : ControllerBase
{
    /// <summary>Get aggregated reaction counts for a byte.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<ReactionsCountResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<ReactionsCountResponse>>> GetReactions(Guid byteId, CancellationToken ct)
    {
        var result = await reactionsBusiness.GetReactionsAsync(byteId, ct);
        return Ok(ApiResponse<ReactionsCountResponse>.Success(result.ToResponse()));
    }

    /// <summary>Add a reaction to a byte. <c>type</c> must be one of: <c>like</c>, <c>fire</c>, <c>mind_blown</c>, <c>bookmark</c>.</summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ToggleLikeResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ToggleLikeResponse>>> ToggleReaction(
        Guid byteId, [FromBody] CreateReactionRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await reactionsBusiness.ToggleReactionAsync(clerkId, byteId, request.Type, ct);
            return Ok(ApiResponse<ToggleLikeResponse>.Success(new ToggleLikeResponse(result.ByteId, result.UserId, result.IsLiked)));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
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

        try
        {
            var ok = await reactionsBusiness.DeleteReactionAsync(clerkId, byteId, ct);
            if (!ok) return NotFound(new { message = "Reaction not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>List users who liked a byte.</summary>
    [HttpGet("~/api/bytes/{byteId:guid}/likes")]
    [ProducesResponseType(typeof(ApiResponse<List<LikerResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LikerResponse>>>> GetLikers(Guid byteId, CancellationToken ct)
    {
        var likers = await reactionsBusiness.GetLikersAsync(byteId, ct);
        return Ok(ApiResponse<List<LikerResponse>>.Success(
            likers.Select(l => new LikerResponse(l.UserId, l.Username, l.DisplayName, l.IsVerified)).ToList()));
    }
}
