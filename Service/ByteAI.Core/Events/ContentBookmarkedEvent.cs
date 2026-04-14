using MediatR;

namespace ByteAI.Core.Events;

public enum BookmarkedContentType { Byte, Interview }

/// <summary>Fired when a user saves/bookmarks a byte or interview.</summary>
public sealed record ContentBookmarkedEvent(
    Guid SaverUserId,    // user who hit bookmark
    Guid ContentAuthorId,// user who owns the content
    BookmarkedContentType ContentType
) : INotification;
