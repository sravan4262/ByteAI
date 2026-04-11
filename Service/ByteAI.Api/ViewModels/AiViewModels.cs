namespace ByteAI.Api.ViewModels;

public sealed record SuggestTagsRequest(string Title, string Body, string? CodeSnippet);
public sealed record SuggestTagsResponse(List<string> Tags);

public sealed record AskRequest(string Question, string? Context);
public sealed record AskResponse(string Answer);

// ── RAG endpoints ──────────────────────────────────────────────────────────
public sealed record ByteAskRequest(string Question);
public sealed record ByteAskResponse(string Answer, string SourceId, string SourceTitle);

public sealed record SearchAskRequest(string Question, string? Type);
public sealed record SearchAskSource(string Id, string Title, string ContentType);
public sealed record SearchAskResponse(string Answer, List<SearchAskSource> Sources);
