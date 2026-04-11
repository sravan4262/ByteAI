namespace ByteAI.Api.ViewModels;

public sealed record SeniorityTypeResponse(Guid Id, string Name, string Label, string Icon, int SortOrder);
public sealed record DomainResponse(Guid Id, string Name, string Label, string Icon, int SortOrder);
public sealed record TechStackResponse(Guid Id, Guid DomainId, string Name, string Label, int SortOrder);
public sealed record BadgeTypeResponse(Guid Id, string Name, string Label, string Icon, string? Description);
public sealed record LevelTypeResponse(Guid Id, int Level, string Name, string Label, int XpRequired, string Icon);
public sealed record SearchTypeResponse(Guid Id, string Name, string Label, string? Description, int SortOrder);
