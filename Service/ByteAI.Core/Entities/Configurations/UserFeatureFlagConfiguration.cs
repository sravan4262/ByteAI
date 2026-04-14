using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserFeatureFlagConfiguration : IEntityTypeConfiguration<UserFeatureFlag>
{
    public void Configure(EntityTypeBuilder<UserFeatureFlag> builder)
    {
        builder.ToTable("user_feature_flags", "users");
        
        builder.HasKey(uf => new { uf.UserId, uf.FeatureFlagTypeId });
        
        builder.Property(uf => uf.UserId).HasColumnName("user_id");
        builder.Property(uf => uf.FeatureFlagTypeId).HasColumnName("feature_flag_type_id");
        builder.Property(uf => uf.GrantedAt).HasColumnName("granted_at").HasDefaultValueSql("now()");

        builder.HasOne(uf => uf.User)
            .WithMany(u => u.UserFeatureFlags)
            .HasForeignKey(uf => uf.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(uf => uf.FeatureFlagType)
            .WithMany(f => f.UserFeatureFlags)
            .HasForeignKey(uf => uf.FeatureFlagTypeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
