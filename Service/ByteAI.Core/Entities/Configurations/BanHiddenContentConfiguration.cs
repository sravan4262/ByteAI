using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class BanHiddenContentConfiguration : IEntityTypeConfiguration<BanHiddenContent>
{
    public void Configure(EntityTypeBuilder<BanHiddenContent> builder)
    {
        builder.ToTable("ban_hidden_content", "moderation");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(b => b.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(b => b.ContentType).HasColumnName("content_type").IsRequired();
        builder.Property(b => b.ContentId).HasColumnName("content_id").IsRequired();
        builder.Property(b => b.HiddenAt).HasColumnName("hidden_at").HasDefaultValueSql("now()");

        builder.HasIndex(b => b.UserId).HasDatabaseName("idx_ban_hidden_user");
    }
}
