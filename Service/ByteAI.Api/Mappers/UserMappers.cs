using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;

namespace ByteAI.Api.Mappers;

public static class UserMappers
{
    public static UserResponse ToResponse(
        this User entity,
        int? bytesCount = null,
        int? followersCount = null,
        int? followingCount = null,
        bool? isFollowedByMe = null) =>
        new(
            Id: entity.Id,
            SupabaseUserId: entity.SupabaseUserId,
            Username: entity.Username,
            DisplayName: entity.DisplayName,
            Bio: entity.Bio,
            AvatarUrl: entity.AvatarUrl,
            Company: entity.Company,
            RoleTitle: entity.RoleTitle,
            Seniority: entity.Seniority,
            Domain: entity.Domain,
            Level: entity.Level,
            Xp: entity.Xp,
            Streak: entity.Streak,
            IsOnboarded: entity.IsOnboarded,
            IsVerified: entity.IsVerified,
            Role: entity.UserRoles != null && entity.UserRoles.Any()
                ? (entity.UserRoles.Any(ur => ur.RoleType != null && ur.RoleType.Name == "admin") ? "admin" : "user")
                : "user",
            CreatedAt: entity.CreatedAt,
            UpdatedAt: entity.UpdatedAt,
            Badges: entity.UserBadges
                .Where(ub => ub.BadgeTypeNav is not null)
                .Select(ub => new BadgeResponse(
                    Name: ub.BadgeTypeNav!.Name,
                    Label: ub.BadgeTypeNav!.Label,
                    Icon: ub.BadgeTypeNav!.Icon,
                    Description: ub.BadgeTypeNav!.Description,
                    EarnedAt: ub.EarnedAt))
                .ToList(),
            BytesCount: bytesCount,
            FollowersCount: followersCount,
            FollowingCount: followingCount,
            IsFollowedByMe: isFollowedByMe,
            TechStack: entity.UserTechStacks
                .Where(uts => uts.TechStack?.Name is not null)
                .Select(uts => uts.TechStack.Name)
                .ToList()
        );
}
