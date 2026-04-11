using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class BadgeTypeConfiguration : IEntityTypeConfiguration<BadgeType>
{
    public void Configure(EntityTypeBuilder<BadgeType> builder)
    {
        builder.ToTable("badge_types", "lookups");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(b => b.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(b => b.Label).HasColumnName("label").HasMaxLength(200).IsRequired();
        builder.Property(b => b.Icon).HasColumnName("icon").HasDefaultValue("🏅");
        builder.Property(b => b.Description).HasColumnName("description");
        builder.HasIndex(b => b.Name).IsUnique();
    }
}
