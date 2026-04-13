namespace ByteAI.Api.ViewModels;

public sealed record UpdateProfileRequest(
    string? DisplayName,
    string? Bio,
    string? Company,
    string? RoleTitle,
    string? Seniority,
    string? Domain,
    List<string>? TechStack
);

public sealed record BadgeResponse(
    string Name,
    string Label,
    string Icon,
    string? Description,
    DateTime EarnedAt
);

public sealed record UserResponse(
    Guid Id,
    string ClerkId,
    string Username,
    string DisplayName,
    string? Bio,
    string? AvatarUrl,
    string? Company,
    string? RoleTitle,
    string? Seniority,
    string? Domain,
    int Level,
    int Xp,
    int Streak,
    bool IsVerified,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<BadgeResponse> Badges,
    int? BytesCount = null,
    int? FollowersCount = null,
    int? FollowingCount = null,
    bool? IsFollowedByMe = null
);

public sealed record SocialResponse(string Platform, string Url, string? Label);

public sealed record UserPreferencesResponse(
    string Theme,
    string Visibility,
    bool NotifReactions,
    bool NotifComments,
    bool NotifFollowers,
    bool NotifUnfollows
);

public sealed record UpdatePreferencesRequest(
    string? Theme,
    string? Visibility,
    bool? NotifReactions,
    bool? NotifComments,
    bool? NotifFollowers,
    bool? NotifUnfollows
);

public sealed record UpsertSocialsRequest(List<UpsertSocialItem> Socials);

public sealed record UpsertSocialItem(string Platform, string Url, string? Label);
