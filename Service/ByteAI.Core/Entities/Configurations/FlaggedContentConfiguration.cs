using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class FlaggedContentConfiguration : IEntityTypeConfiguration<FlaggedContent>
{
    public void Configure(EntityTypeBuilder<FlaggedContent> builder)
    {
        builder.ToTable("flagged_content", "moderation");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(f => f.ContentType).HasColumnName("content_type").IsRequired();
        builder.Property(f => f.ContentId).HasColumnName("content_id").IsRequired();
        builder.Property(f => f.ReporterUserId).HasColumnName("reporter_user_id");
        builder.Property(f => f.ContentAuthorId).HasColumnName("content_author_id");
        builder.Property(f => f.ReasonCode).HasColumnName("reason_code").IsRequired();
        builder.Property(f => f.ReasonMessage).HasColumnName("reason_message");
        builder.Property(f => f.Severity).HasColumnName("severity").IsRequired();
        builder.Property(f => f.Status).HasColumnName("status").IsRequired().HasDefaultValue("open");
        builder.Property(f => f.Score).HasColumnName("score");
        builder.Property(f => f.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
        builder.Property(f => f.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(f => f.ResolvedAt).HasColumnName("resolved_at");
        builder.Property(f => f.ResolvedBy).HasColumnName("resolved_by");

        builder.HasIndex(f => new { f.Status, f.CreatedAt }).HasDatabaseName("idx_flagged_content_status");
        builder.HasIndex(f => new { f.ContentType, f.ContentId }).HasDatabaseName("idx_flagged_content_target");
    }
}
