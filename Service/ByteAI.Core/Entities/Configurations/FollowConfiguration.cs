using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class FollowConfiguration : IEntityTypeConfiguration<Follow>
{
    public void Configure(EntityTypeBuilder<Follow> builder)
    {
        builder.ToTable("follows");

        builder.HasKey(f => new { f.FollowerId, f.FollowingId });
        builder.Property(f => f.FollowerId).HasColumnName("follower_id");
        builder.Property(f => f.FollowingId).HasColumnName("following_id");
        builder.Property(f => f.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(f => f.Follower).WithMany(u => u.Following)
            .HasForeignKey(f => f.FollowerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(f => f.Following).WithMany(u => u.Followers)
            .HasForeignKey(f => f.FollowingId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(f => f.FollowingId).HasDatabaseName("ix_follows_following_id");
    }
}
