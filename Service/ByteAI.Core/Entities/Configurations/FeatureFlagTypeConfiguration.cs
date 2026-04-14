using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class FeatureFlagTypeConfiguration : IEntityTypeConfiguration<FeatureFlagType>
{
    public void Configure(EntityTypeBuilder<FeatureFlagType> builder)
    {
        builder.ToTable("feature_flag_types", "lookups");
        
        builder.HasKey(f => f.Id);
        
        builder.Property(f => f.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(f => f.Key).HasColumnName("key").HasMaxLength(100).IsRequired();
        builder.Property(f => f.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(f => f.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(f => f.GlobalOpen).HasColumnName("global_open").HasDefaultValue(false);
        builder.Property(f => f.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(f => f.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        builder.HasIndex(f => f.Key).IsUnique().HasDatabaseName("uq_feature_flag_types_key");
    }
}
