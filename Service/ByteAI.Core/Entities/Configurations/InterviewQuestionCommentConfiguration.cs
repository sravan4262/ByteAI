using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewQuestionCommentConfiguration : IEntityTypeConfiguration<InterviewQuestionComment>
{
    public void Configure(EntityTypeBuilder<InterviewQuestionComment> builder)
    {
        builder.ToTable("interview_question_comments", "interviews");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(c => c.AuthorId).HasColumnName("author_id").IsRequired();
        builder.Property(c => c.Body).HasColumnName("body").HasMaxLength(2000).IsRequired();
        builder.Property(c => c.ParentId).HasColumnName("parent_id");
        builder.Property(c => c.VoteCount).HasColumnName("vote_count").HasDefaultValue(0);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(c => c.Question)
            .WithMany(q => q.Comments)
            .HasForeignKey(c => c.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Author)
            .WithMany()
            .HasForeignKey(c => c.AuthorId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Parent)
            .WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.QuestionId).HasDatabaseName("ix_iq_comments_question_id");
        builder.HasIndex(c => c.AuthorId).HasDatabaseName("ix_iq_comments_author_id");
    }
}
