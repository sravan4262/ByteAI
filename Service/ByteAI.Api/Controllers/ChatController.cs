using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/conversations")]
[Produces("application/json")]
[Tags("Chat")]
[Authorize]
[RequireRole("user")]
[RequireFeatureFlag("chat")]
public sealed class ChatController(ChatService chatService, ICurrentUserService currentUserService) : ControllerBase
{
    /// <summary>Returns the authenticated user's conversation inbox sorted by most recent activity.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ConversationDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<List<ConversationDto>>>> GetConversations(CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId is null) return Unauthorized();

        var conversations = await chatService.GetConversationsAsync(userId.Value, ct);
        return Ok(ApiResponse<List<ConversationDto>>.Success(conversations));
    }

    /// <summary>Returns paginated message history for a conversation.</summary>
    [HttpGet("{conversationId:guid}/messages")]
    [ProducesResponseType(typeof(ApiResponse<List<MessageDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<List<MessageDto>>>> GetMessages(
        Guid conversationId,
        [FromQuery] DateTime? cursor,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId is null) return Unauthorized();

        limit = Math.Clamp(limit, 1, 100);
        var messages = await chatService.GetMessagesAsync(conversationId, userId.Value, cursor, limit, ct);
        return Ok(ApiResponse<List<MessageDto>>.Success(messages));
    }

    /// <summary>
    /// Gets or creates a conversation with the specified user.
    /// - If a conversation already exists, returns it regardless of follow state (so users can
    ///   re-open and view history with someone they no longer mutually follow).
    /// - If no conversation exists, mutual-follow is required to create a new one.
    /// The response includes <c>canMessage</c>, which reflects current mutual-follow state and
    /// is enforced server-side by <see cref="Hubs.ChatHub.SendMessage"/>.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ConversationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<object>>> GetOrCreate([FromBody] GetOrCreateConversationRequest request, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId is null) return Unauthorized();

        var canMessage = await chatService.CanMessageAsync(userId.Value, request.RecipientId, ct);
        var existing = await chatService.GetExistingConversationAsync(userId.Value, request.RecipientId, ct);

        if (existing is not null)
            return Ok(ApiResponse<object>.Success(new { conversationId = existing.Id, canMessage }));

        if (!canMessage) return Forbid();

        var conversation = await chatService.GetOrCreateConversationAsync(userId.Value, request.RecipientId, ct);
        return Ok(ApiResponse<object>.Success(new { conversationId = conversation.Id, canMessage = true }));
    }

    /// <summary>Returns mutual follows searchable by username or display name — the set of users you can message.</summary>
    [HttpGet("messageable")]
    [ProducesResponseType(typeof(ApiResponse<List<MutualFollowDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<List<MutualFollowDto>>>> GetMessageable(
        [FromQuery] string? search, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId is null) return Unauthorized();

        var results = await chatService.GetMutualFollowsAsync(userId.Value, search, ct);
        return Ok(ApiResponse<List<MutualFollowDto>>.Success(results));
    }

    private async Task<Guid?> ResolveUserIdAsync(CancellationToken ct)
    {
        var supabaseId = HttpContext.GetSupabaseUserId();
        if (string.IsNullOrEmpty(supabaseId)) return null;
        return await currentUserService.GetCurrentUserIdAsync(supabaseId, ct);
    }
}

public sealed record GetOrCreateConversationRequest(Guid RecipientId);
