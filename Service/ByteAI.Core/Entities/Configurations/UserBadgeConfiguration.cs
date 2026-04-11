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
        builder.Property(b => b.BadgeTypeId).HasColumnName("badge_type_id").IsRequired();
        builder.Property(b => b.EarnedAt).HasColumnName("earned_at").HasDefaultValueSql("now()");

        builder.HasOne(b => b.User).WithMany(u => u.UserBadges)
            .HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.BadgeTypeNav).WithMany()
            .HasForeignKey(b => b.BadgeTypeId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => b.UserId).HasDatabaseName("ix_user_badges_user_id");
        builder.HasIndex(b => new { b.UserId, b.BadgeTypeId }).IsUnique().HasDatabaseName("uq_user_badges_user_type");
    }
}
