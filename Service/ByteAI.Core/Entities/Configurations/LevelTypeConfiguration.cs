using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class LevelTypeConfiguration : IEntityTypeConfiguration<LevelType>
{
    public void Configure(EntityTypeBuilder<LevelType> builder)
    {
        builder.ToTable("level_types", "lookups");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(l => l.Level).HasColumnName("level").IsRequired();
        builder.Property(l => l.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(l => l.Label).HasColumnName("label").HasMaxLength(200).IsRequired();
        builder.Property(l => l.XpRequired).HasColumnName("xp_required").HasDefaultValue(0);
        builder.Property(l => l.Icon).HasColumnName("icon").HasDefaultValue("⭐");
        builder.HasIndex(l => l.Level).IsUnique();
        builder.HasIndex(l => l.Name).IsUnique();
    }
}
