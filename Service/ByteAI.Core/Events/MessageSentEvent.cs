using MediatR;

namespace ByteAI.Core.Events;

public sealed record MessageSentEvent(Guid MessageId, Guid ConversationId, Guid SenderId, Guid RecipientId) : INotification;
