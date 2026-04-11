using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class DomainConfiguration : IEntityTypeConfiguration<Domain>
{
    public void Configure(EntityTypeBuilder<Domain> builder)
    {
        builder.ToTable("domains", "lookups");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(d => d.Name).HasColumnName("name").HasMaxLength(50).IsRequired();
        builder.Property(d => d.Label).HasColumnName("label").HasMaxLength(100).IsRequired();
        builder.Property(d => d.Icon).HasColumnName("icon").HasDefaultValue("");
        builder.Property(d => d.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
        builder.HasIndex(d => d.Name).IsUnique();
    }
}
