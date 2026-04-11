using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class TrendingEventConfiguration : IEntityTypeConfiguration<TrendingEvent>
{
    public void Configure(EntityTypeBuilder<TrendingEvent> builder)
    {
        builder.ToTable("trending", "bytes");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(t => t.ContentId).HasColumnName("content_id").IsRequired();
        builder.Property(t => t.ContentType).HasColumnName("content_type").IsRequired();
        builder.Property(t => t.UserId).HasColumnName("user_id");
        builder.Property(t => t.ClickedAt).HasColumnName("clicked_at").HasDefaultValueSql("now()");

        builder.HasIndex(t => new { t.ContentId, t.ContentType }).HasDatabaseName("ix_trending_content");
        builder.HasIndex(t => t.ClickedAt).HasDatabaseName("ix_trending_clicked_at").IsDescending();
    }
}
