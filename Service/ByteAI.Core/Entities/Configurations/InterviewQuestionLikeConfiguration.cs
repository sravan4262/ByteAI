using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewQuestionLikeConfiguration : IEntityTypeConfiguration<InterviewQuestionLike>
{
    public void Configure(EntityTypeBuilder<InterviewQuestionLike> builder)
    {
        builder.ToTable("interview_question_likes", "interviews");
        builder.HasKey(l => new { l.QuestionId, l.UserId });
        builder.Property(l => l.QuestionId).HasColumnName("question_id");
        builder.Property(l => l.UserId).HasColumnName("user_id");
        builder.Property(l => l.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(l => l.Question)
            .WithMany(q => q.Likes)
            .HasForeignKey(l => l.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(l => l.QuestionId).HasDatabaseName("ix_iq_likes_question_id");
    }
}
