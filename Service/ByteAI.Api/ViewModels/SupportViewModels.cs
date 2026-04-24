namespace ByteAI.Api.ViewModels;

public sealed record SubmitFeedbackRequest(
    string Type,
    string Message,
    string? PageContext
);

public sealed record UpdateFeedbackStatusRequest(
    string Status,
    string? AdminNote
);

public sealed record FeedbackResponse(
    Guid Id,
    string Type,
    string Message,
    string? PageContext,
    string Status,
    string? AdminNote,
    DateTime CreatedAt
);

public sealed record AdminFeedbackResponse(
    Guid Id,
    string Type,
    string Message,
    string? PageContext,
    string Status,
    string? AdminNote,
    string? Username,
    Guid? UserId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
