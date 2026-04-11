using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;

namespace ByteAI.Api.Mappers;

public static class UserMappers
{
    public static UserResponse ToResponse(this User entity) =>
        new(
            Id: entity.Id,
            ClerkId: entity.ClerkId,
            Username: entity.Username,
            DisplayName: entity.DisplayName,
            Bio: entity.Bio,
            AvatarUrl: entity.AvatarUrl,
            Level: entity.Level,
            Xp: entity.Xp,
            Streak: entity.Streak,
            IsVerified: entity.IsVerified,
            CreatedAt: entity.CreatedAt,
            UpdatedAt: entity.UpdatedAt
        );
}
