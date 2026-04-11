namespace ByteAI.Api.ViewModels;

public sealed record UpdateProfileRequest(
    string? DisplayName,
    string? Bio
);

public sealed record UserResponse(
    Guid Id,
    string ClerkId,
    string Username,
    string DisplayName,
    string? Bio,
    string? AvatarUrl,
    int Level,
    int Xp,
    int Streak,
    bool IsVerified,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
