using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewCommentConfiguration : IEntityTypeConfiguration<InterviewComment>
{
    public void Configure(EntityTypeBuilder<InterviewComment> builder)
    {
        builder.ToTable("interview_comments", "interviews");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.InterviewId).HasColumnName("interview_id").IsRequired();
        builder.Property(c => c.AuthorId).HasColumnName("author_id").IsRequired();
        builder.Property(c => c.ParentId).HasColumnName("parent_id");
        builder.Property(c => c.Body).HasColumnName("body").IsRequired();
        builder.Property(c => c.VoteCount).HasColumnName("vote_count").HasDefaultValue(0);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(c => c.Interview).WithMany(i => i.Comments)
            .HasForeignKey(c => c.InterviewId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(c => c.Author).WithMany()
            .HasForeignKey(c => c.AuthorId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(c => c.Parent).WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.InterviewId).HasDatabaseName("ix_interview_comments_interview_id");
        builder.HasIndex(c => c.AuthorId).HasDatabaseName("ix_interview_comments_author_id");
    }
}
