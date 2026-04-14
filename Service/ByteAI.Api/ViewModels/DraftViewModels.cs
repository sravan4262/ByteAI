namespace ByteAI.Api.ViewModels;

public sealed record SaveDraftRequest(
    Guid? DraftId,
    string? Title,
    string? Body,
    string? CodeSnippet,
    string? Language,
    string[]? Tags
);

public sealed record DraftResponse(
    Guid Id,
    Guid AuthorId,
    string? Title,
    string? Body,
    string? CodeSnippet,
    string? Language,
    string[] Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
