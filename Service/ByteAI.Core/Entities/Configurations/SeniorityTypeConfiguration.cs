using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class SeniorityTypeConfiguration : IEntityTypeConfiguration<SeniorityType>
{
    public void Configure(EntityTypeBuilder<SeniorityType> builder)
    {
        builder.ToTable("seniority_types", "lookups");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Name).HasColumnName("name").HasMaxLength(50).IsRequired();
        builder.Property(s => s.Label).HasColumnName("label").HasMaxLength(100).IsRequired();
        builder.Property(s => s.Icon).HasColumnName("icon").HasDefaultValue("");
        builder.Property(s => s.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
        builder.HasIndex(s => s.Name).IsUnique();
    }
}
