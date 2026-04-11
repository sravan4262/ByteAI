using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewBookmarkConfiguration : IEntityTypeConfiguration<InterviewBookmark>
{
    public void Configure(EntityTypeBuilder<InterviewBookmark> builder)
    {
        builder.ToTable("interview_bookmarks", "interviews");
        builder.HasKey(b => new { b.InterviewId, b.UserId });
        builder.Property(b => b.InterviewId).HasColumnName("interview_id");
        builder.Property(b => b.UserId).HasColumnName("user_id");
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(b => b.Interview).WithMany(i => i.Bookmarks)
            .HasForeignKey(b => b.InterviewId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.User).WithMany()
            .HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => b.UserId).HasDatabaseName("ix_interview_bookmarks_user_id");
    }
}
