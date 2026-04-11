using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewLikeConfiguration : IEntityTypeConfiguration<InterviewLike>
{
    public void Configure(EntityTypeBuilder<InterviewLike> builder)
    {
        builder.ToTable("interview_likes", "interviews");
        builder.HasKey(r => new { r.InterviewId, r.UserId });
        builder.Property(r => r.InterviewId).HasColumnName("interview_id");
        builder.Property(r => r.UserId).HasColumnName("user_id");
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(r => r.Interview).WithMany(i => i.InterviewLikes)
            .HasForeignKey(r => r.InterviewId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(r => r.User).WithMany()
            .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.UserId).HasDatabaseName("ix_interview_likes_user_id");
    }
}
