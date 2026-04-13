using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserFollowingConfiguration : IEntityTypeConfiguration<UserFollowing>
{
    public void Configure(EntityTypeBuilder<UserFollowing> builder)
    {
        builder.ToTable("userfollowing", "users");

        builder.HasKey(f => new { f.UserId, f.FollowingId });
        builder.Property(f => f.UserId).HasColumnName("user_id");
        builder.Property(f => f.FollowingId).HasColumnName("following_id");
        builder.Property(f => f.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        // UserId → "the user who is following"
        builder.HasOne(f => f.User)
            .WithMany(u => u.Following)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // FollowingId → "the user being followed" — no nav on User for this side
        builder.HasOne(f => f.Following)
            .WithMany()
            .HasForeignKey(f => f.FollowingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => f.FollowingId).HasDatabaseName("ix_userfollowing_following_id");
    }
}
