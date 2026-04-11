using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class SearchTypeConfiguration : IEntityTypeConfiguration<SearchType>
{
    public void Configure(EntityTypeBuilder<SearchType> builder)
    {
        builder.ToTable("search_types", "lookups");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Name).HasColumnName("name").HasMaxLength(50).IsRequired();
        builder.Property(s => s.Label).HasColumnName("label").HasMaxLength(100).IsRequired();
        builder.Property(s => s.Description).HasColumnName("description");
        builder.Property(s => s.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
        builder.HasIndex(s => s.Name).IsUnique();
    }
}
