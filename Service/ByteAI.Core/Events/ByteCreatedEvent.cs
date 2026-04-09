using MediatR;

namespace ByteAI.Core.Events;

public sealed record ByteCreatedEvent(Guid ByteId, string Body, string? CodeSnippet) : INotification;
