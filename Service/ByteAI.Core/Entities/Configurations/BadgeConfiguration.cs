using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class BadgeConfiguration : IEntityTypeConfiguration<Badge>
{
    public void Configure(EntityTypeBuilder<Badge> builder)
    {
        builder.ToTable("badges");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(b => b.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(b => b.BadgeType).HasColumnName("badge_type").IsRequired();
        builder.Property(b => b.EarnedAt).HasColumnName("earned_at").HasDefaultValueSql("now()");

        builder.HasOne(b => b.User).WithMany(u => u.Badges)
            .HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => b.UserId).HasDatabaseName("ix_badges_user_id");
        builder.HasIndex(b => new { b.UserId, b.BadgeType }).IsUnique().HasDatabaseName("uq_badges_user_type");
    }
}
