using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserFollowerConfiguration : IEntityTypeConfiguration<UserFollower>
{
    public void Configure(EntityTypeBuilder<UserFollower> builder)
    {
        builder.ToTable("userfollowers", "users");

        builder.HasKey(f => new { f.UserId, f.FollowerId });
        builder.Property(f => f.UserId).HasColumnName("user_id");
        builder.Property(f => f.FollowerId).HasColumnName("follower_id");
        builder.Property(f => f.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        // UserId → "the user being followed"
        builder.HasOne(f => f.User)
            .WithMany(u => u.Followers)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // FollowerId → "the user doing the following" — no nav on User for this side
        builder.HasOne(f => f.Follower)
            .WithMany()
            .HasForeignKey(f => f.FollowerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => f.FollowerId).HasDatabaseName("ix_userfollowers_follower_id");
    }
}
