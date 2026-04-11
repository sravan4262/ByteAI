using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewQuestionConfiguration : IEntityTypeConfiguration<InterviewQuestion>
{
    public void Configure(EntityTypeBuilder<InterviewQuestion> builder)
    {
        builder.ToTable("interview_questions", "interviews");
        builder.HasKey(q => q.Id);
        builder.Property(q => q.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(q => q.InterviewId).HasColumnName("interview_id").IsRequired();
        builder.Property(q => q.Question).HasColumnName("question").HasMaxLength(1000).IsRequired();
        builder.Property(q => q.Answer).HasColumnName("answer").IsRequired();
        builder.Property(q => q.OrderIndex).HasColumnName("order_index").HasDefaultValue(0);
        builder.Property(q => q.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(q => q.Interview)
            .WithMany(i => i.Questions)
            .HasForeignKey(q => q.InterviewId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(q => q.InterviewId).HasDatabaseName("ix_interview_questions_interview_id");
        builder.HasIndex(q => new { q.InterviewId, q.OrderIndex }).HasDatabaseName("ix_interview_questions_order");
    }
}
