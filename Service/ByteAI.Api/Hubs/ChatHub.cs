using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Moderation;
using ByteAI.Core.Services.Chat;
using ByteAI.Core.Services.FeatureFlags;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ByteAI.Api.Hubs;

[Authorize]
public sealed class ChatHub(
    ChatService chatService,
    IFeatureFlagService featureFlagService,
    ICurrentUserService currentUserService,
    IModerationService moderation,
    AppDbContext db) : Hub<IChatClient>
{
    public override async Task OnConnectedAsync()
    {
        var userId = await ResolveUserIdAsync();
        if (userId is null) { Context.Abort(); return; }

        var supabaseId = Context.User!.FindFirst("sub")!.Value;
        var flags = await featureFlagService.GetEnabledAsync(supabaseId, Context.ConnectionAborted);
        if (!flags.Any(f => f.Key == "chat")) { Context.Abort(); return; }

        Context.Items["userId"] = userId.Value;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        await base.OnConnectedAsync();
    }

    public async Task SendMessage(Guid recipientId, string content)
    {
        var senderId = GetCachedUserId() ?? await ResolveUserIdAsync();
        if (senderId is null) throw new HubException("Unauthorized.");

        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000)
            throw new HubException("Message content must be between 1 and 2000 characters.");

        // Moderation runs before persistence/broadcast. High severity surfaces as a HubException
        // so the SignalR caller sees a typed failure and the message never fans out to the recipient.
        try
        {
            await moderation.EnforceAsync(db, content, ModerationContext.Chat, ct: Context.ConnectionAborted);
        }
        catch (ContentModerationException ex)
        {
            var codes = string.Join(",", ex.Reasons.Select(r => r.Code));
            throw new HubException($"Message rejected by moderation ({codes}).");
        }

        var canMessage = await chatService.CanMessageAsync(senderId.Value, recipientId, Context.ConnectionAborted);
        if (!canMessage) throw new HubException("You must follow each other to send messages.");

        var conversation = await chatService.GetOrCreateConversationAsync(senderId.Value, recipientId, Context.ConnectionAborted);
        var message = await chatService.SendMessageAsync(conversation.Id, senderId.Value, recipientId, content, Context.ConnectionAborted);

        var payload = new
        {
            messageId = message.Id,
            conversationId = conversation.Id,
            senderId = senderId.Value,
            content = message.Content,
            sentAt = message.SentAt,
        };

        await Clients.Group($"user-{recipientId}").ReceiveMessage(payload);
        await Clients.Caller.MessageSent(payload);
    }

    public async Task MarkRead(Guid conversationId)
    {
        var userId = GetCachedUserId() ?? await ResolveUserIdAsync();
        if (userId is null) throw new HubException("Unauthorized.");

        await chatService.MarkReadAsync(conversationId, userId.Value, Context.ConnectionAborted);
    }

    private Guid? GetCachedUserId() =>
        Context.Items.TryGetValue("userId", out var v) && v is Guid id ? id : null;

    private async Task<Guid?> ResolveUserIdAsync()
    {
        var supabaseId = Context.User?.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(supabaseId)) return null;
        var resolved = await currentUserService.GetCurrentUserIdAsync(supabaseId, Context.ConnectionAborted);
        if (resolved.HasValue) Context.Items["userId"] = resolved.Value;
        return resolved;
    }
}
