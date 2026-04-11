using MediatR;

namespace ByteAI.Core.Events;

public sealed record ByteCreatedEvent(Guid ByteId, Guid AuthorId, string Title, string Body, string? CodeSnippet) : INotification;
