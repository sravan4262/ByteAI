using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Chat;

public sealed class ChatService(AppDbContext db, IPublisher publisher)
{
    public async Task<bool> CanMessageAsync(Guid senderId, Guid recipientId, CancellationToken ct)
    {
        var count = await db.UserFollowings
            .CountAsync(f =>
                (f.UserId == senderId && f.FollowingId == recipientId) ||
                (f.UserId == recipientId && f.FollowingId == senderId), ct);
        return count == 2;
    }

    /// <summary>
    /// Returns the conversation between two users without creating one. Used by the controller
    /// to allow re-opening past conversations even after a follow was severed (the
    /// CanMessageAsync gate only applies to *creating* a new thread).
    /// </summary>
    public Task<Conversation?> GetExistingConversationAsync(Guid userAId, Guid userBId, CancellationToken ct)
    {
        var a = userAId < userBId ? userAId : userBId;
        var b = userAId < userBId ? userBId : userAId;
        return db.Conversations.FirstOrDefaultAsync(c => c.ParticipantAId == a && c.ParticipantBId == b, ct);
    }

    public async Task<Conversation> GetOrCreateConversationAsync(Guid userAId, Guid userBId, CancellationToken ct)
    {
        var a = userAId < userBId ? userAId : userBId;
        var b = userAId < userBId ? userBId : userAId;

        var existing = await db.Conversations
            .FirstOrDefaultAsync(c => c.ParticipantAId == a && c.ParticipantBId == b, ct);

        if (existing is not null) return existing;

        var conversation = new Conversation { ParticipantAId = a, ParticipantBId = b };
        db.Conversations.Add(conversation);
        db.ConversationParticipants.Add(new ConversationParticipant { ConversationId = conversation.Id, UserId = a });
        db.ConversationParticipants.Add(new ConversationParticipant { ConversationId = conversation.Id, UserId = b });
        await db.SaveChangesAsync(ct);
        return conversation;
    }

    public async Task<Message> SendMessageAsync(Guid conversationId, Guid senderId, Guid recipientId, string content, CancellationToken ct)
    {
        var message = new Message { ConversationId = conversationId, SenderId = senderId, Content = content };
        db.Messages.Add(message);

        var conv = await db.Conversations.FindAsync([conversationId], ct);
        if (conv is not null) conv.LastMessageAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await publisher.Publish(new MessageSentEvent(message.Id, conversationId, senderId, recipientId), ct);
        return message;
    }

    public async Task<List<ConversationDto>> GetConversationsAsync(Guid userId, CancellationToken ct)
    {
        return await db.Conversations
            .Where(c => c.ParticipantAId == userId || c.ParticipantBId == userId)
            .OrderByDescending(c => c.LastMessageAt)
            .Select(c => new ConversationDto(
                c.Id,
                c.ParticipantAId == userId ? c.ParticipantBId : c.ParticipantAId,
                db.Users
                    .Where(u => u.Id == (c.ParticipantAId == userId ? c.ParticipantBId : c.ParticipantAId))
                    .Select(u => u.Username).FirstOrDefault() ?? string.Empty,
                db.Users
                    .Where(u => u.Id == (c.ParticipantAId == userId ? c.ParticipantBId : c.ParticipantAId))
                    .Select(u => u.DisplayName).FirstOrDefault() ?? string.Empty,
                db.Users
                    .Where(u => u.Id == (c.ParticipantAId == userId ? c.ParticipantBId : c.ParticipantAId))
                    .Select(u => u.AvatarUrl).FirstOrDefault(),
                db.Messages
                    .Where(m => m.ConversationId == c.Id)
                    .OrderByDescending(m => m.SentAt)
                    .Select(m => m.Content).FirstOrDefault(),
                c.LastMessageAt,
                !db.ConversationParticipants
                    .Where(cp => cp.ConversationId == c.Id && cp.UserId == userId)
                    .Any(cp => cp.LastReadAt >= c.LastMessageAt)
                &&
                db.Messages
                    .Where(m => m.ConversationId == c.Id)
                    .OrderByDescending(m => m.SentAt)
                    .Select(m => m.SenderId)
                    .FirstOrDefault() != userId,
                // CanMessage: both directions of follow must currently exist. Reflects real-time
                // mutual-follow state so the UI can grey out the input the moment a follow is severed.
                db.UserFollowings.Any(f =>
                        f.UserId == userId &&
                        f.FollowingId == (c.ParticipantAId == userId ? c.ParticipantBId : c.ParticipantAId))
                &&
                db.UserFollowings.Any(f =>
                        f.UserId == (c.ParticipantAId == userId ? c.ParticipantBId : c.ParticipantAId) &&
                        f.FollowingId == userId)
            ))
            .ToListAsync(ct);
    }

    public async Task<List<MessageDto>> GetMessagesAsync(Guid conversationId, Guid userId, DateTime? cursor, int limit, CancellationToken ct)
    {
        var query = db.Messages.Where(m => m.ConversationId == conversationId);

        if (cursor.HasValue)
            query = query.Where(m => m.SentAt < cursor.Value);

        return await query
            .OrderByDescending(m => m.SentAt)
            .Take(limit)
            .Select(m => new MessageDto(m.Id, m.SenderId, m.Content, m.SentAt, m.ReadAt))
            .ToListAsync(ct);
    }

    public async Task MarkReadAsync(Guid conversationId, Guid userId, CancellationToken ct)
    {
        await db.ConversationParticipants
            .Where(cp => cp.ConversationId == conversationId && cp.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(cp => cp.LastReadAt, DateTime.UtcNow), ct);
    }

    public async Task<List<MutualFollowDto>> GetMutualFollowsAsync(Guid userId, string? search, CancellationToken ct)
    {
        var query = db.UserFollowings
            .Where(f => f.UserId == userId &&
                db.UserFollowings.Any(r => r.UserId == f.FollowingId && r.FollowingId == userId))
            .Select(f => f.Following);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u =>
                EF.Functions.ILike(u.Username, $"%{search}%") ||
                EF.Functions.ILike(u.DisplayName, $"%{search}%"));

        return await query
            .OrderBy(u => u.Username)
            .Take(20)
            .Select(u => new MutualFollowDto(u.Id, u.Username, u.DisplayName, u.AvatarUrl))
            .ToListAsync(ct);
    }
}

public sealed record ConversationDto(
    Guid Id,
    Guid OtherUserId,
    string OtherUsername,
    string OtherDisplayName,
    string? OtherAvatarUrl,
    string? LastMessage,
    DateTime LastMessageAt,
    bool HasUnread,
    bool CanMessage
);

public sealed record MessageDto(
    Guid Id,
    Guid SenderId,
    string Content,
    DateTime SentAt,
    DateTime? ReadAt
);

public sealed record MutualFollowDto(
    Guid Id,
    string Username,
    string DisplayName,
    string? AvatarUrl
);
