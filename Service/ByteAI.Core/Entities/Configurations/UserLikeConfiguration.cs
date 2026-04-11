using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserLikeConfiguration : IEntityTypeConfiguration<UserLike>
{
    public void Configure(EntityTypeBuilder<UserLike> builder)
    {
        builder.ToTable("user_likes", "bytes");

        builder.HasKey(r => new { r.ByteId, r.UserId });
        builder.Property(r => r.ByteId).HasColumnName("byte_id");
        builder.Property(r => r.UserId).HasColumnName("user_id");
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(r => r.Byte).WithMany(b => b.UserLikes)
            .HasForeignKey(r => r.ByteId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(r => r.User).WithMany(u => u.UserLikes)
            .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.UserId).HasDatabaseName("ix_user_likes_user_id");
    }
}
