using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class ByteQualityScoreConfiguration : IEntityTypeConfiguration<ByteQualityScore>
{
    public void Configure(EntityTypeBuilder<ByteQualityScore> builder)
    {
        builder.ToTable("byte_quality_scores", "bytes");
        builder.HasKey(q => q.ByteId);
        builder.Property(q => q.ByteId).HasColumnName("byte_id");
        builder.Property(q => q.Clarity).HasColumnName("clarity");
        builder.Property(q => q.Specificity).HasColumnName("specificity");
        builder.Property(q => q.Relevance).HasColumnName("relevance");
        builder.Property(q => q.Overall).HasColumnName("overall");
        builder.Property(q => q.ComputedAt).HasColumnName("computed_at").HasDefaultValueSql("now()");

        builder.HasOne(q => q.Byte).WithOne()
            .HasForeignKey<ByteQualityScore>(q => q.ByteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
