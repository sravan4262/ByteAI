namespace ByteAI.Api.ViewModels;

public sealed record SuggestTagsRequest(string Title, string Body, string? CodeSnippet);
public sealed record SuggestTagsResponse(List<string> Tags);

public sealed record AskRequest(string Question, string? Context);
public sealed record AskResponse(string Answer);
