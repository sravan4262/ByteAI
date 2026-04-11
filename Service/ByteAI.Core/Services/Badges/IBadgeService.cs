using ByteAI.Core.Entities;

namespace ByteAI.Core.Services.Badges;

public interface IBadgeService
{
    /// <summary>
    /// Check badge conditions for the given trigger and award any newly qualifying badges.
    /// Returns the list of newly earned BadgeType records.
    /// </summary>
    Task<List<BadgeType>> CheckAndAwardAsync(Guid userId, BadgeTrigger trigger, CancellationToken ct);
}
