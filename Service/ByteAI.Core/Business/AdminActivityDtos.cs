namespace ByteAI.Core.Business;

public sealed record ActivityUserDto(
    Guid    UserId,
    string  DisplayName,
    string  Username,
    string? AvatarUrl,
    string  Email,
    DateTimeOffset ActivityAt);

public sealed record ActivityPagedResult(
    IReadOnlyList<ActivityUserDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public sealed record UserActivityResponse(
    ActivityPagedResult LoggedInToday,
    ActivityPagedResult CurrentlyLoggedIn);
