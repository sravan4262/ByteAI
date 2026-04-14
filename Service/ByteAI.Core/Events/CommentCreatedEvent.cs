using MediatR;

namespace ByteAI.Core.Events;

/// <summary>Fired after a comment is successfully persisted.</summary>
public sealed record CommentCreatedEvent(
    Guid CommentId,
    Guid AuthorId,       // user who wrote the comment
    Guid ContentAuthorId // user who owns the byte/interview being commented on
) : INotification;
