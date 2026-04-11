using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserBadgeConfiguration : IEntityTypeConfiguration<UserBadge>
{
    public void Configure(EntityTypeBuilder<UserBadge> builder)
    {
        builder.ToTable("user_badges", "users");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(b => b.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(b => b.BadgeTypeId).HasColumnName("badge_type_id"); // nullable
        builder.Property(b => b.BadgeType).HasColumnName("badge_type").HasMaxLength(100).IsRequired();
        builder.Property(b => b.EarnedAt).HasColumnName("earned_at").HasDefaultValueSql("now()");

        builder.HasOne(b => b.User).WithMany(u => u.UserBadges)
            .HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.BadgeTypeNav).WithMany(bt => bt.UserBadges)
            .HasForeignKey(b => b.BadgeTypeId).OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(b => b.UserId).HasDatabaseName("ix_user_badges_user_id");
        // Unique on (user_id, badge_type) — matches the DB unique index
        builder.HasIndex(b => new { b.UserId, b.BadgeType }).IsUnique().HasDatabaseName("uq_user_badges_user_type");
    }
}
