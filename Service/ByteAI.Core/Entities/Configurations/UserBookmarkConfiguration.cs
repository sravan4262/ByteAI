using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserBookmarkConfiguration : IEntityTypeConfiguration<UserBookmark>
{
    public void Configure(EntityTypeBuilder<UserBookmark> builder)
    {
        builder.ToTable("user_bookmarks", "bytes");

        builder.HasKey(b => new { b.ByteId, b.UserId });
        builder.Property(b => b.ByteId).HasColumnName("byte_id");
        builder.Property(b => b.UserId).HasColumnName("user_id");
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(b => b.Byte).WithMany(by => by.UserBookmarks)
            .HasForeignKey(b => b.ByteId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.User).WithMany(u => u.UserBookmarks)
            .HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => b.UserId).HasDatabaseName("ix_user_bookmarks_user_id");
    }
}
