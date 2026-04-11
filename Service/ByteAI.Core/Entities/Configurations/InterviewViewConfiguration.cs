using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewViewConfiguration : IEntityTypeConfiguration<InterviewView>
{
    public void Configure(EntityTypeBuilder<InterviewView> builder)
    {
        builder.ToTable("interview_views", "interviews");

        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(v => v.InterviewId).HasColumnName("interview_id").IsRequired();
        builder.Property(v => v.UserId).HasColumnName("user_id");
        builder.Property(v => v.ViewedAt).HasColumnName("viewed_at").HasDefaultValueSql("now()");

        builder.HasOne(v => v.Interview).WithMany(i => i.InterviewViews)
            .HasForeignKey(v => v.InterviewId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(v => v.User).WithMany()
            .HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(v => v.InterviewId).HasDatabaseName("ix_interview_views_interview_id");
        builder.HasIndex(v => v.UserId).HasDatabaseName("ix_interview_views_user_id");
        builder.HasIndex(v => v.ViewedAt).HasDatabaseName("ix_interview_views_viewed_at").IsDescending();
    }
}
