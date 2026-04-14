namespace ByteAI.Core.Entities;

public sealed class UserFeatureFlag
{
    public Guid UserId { get; set; }
    public Guid FeatureFlagTypeId { get; set; }
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public FeatureFlagType FeatureFlagType { get; set; } = null!;
}
