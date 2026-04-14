using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class RoleTypeConfiguration : IEntityTypeConfiguration<RoleType>
{
    public void Configure(EntityTypeBuilder<RoleType> builder)
    {
        builder.ToTable("role_types", "lookups");
        
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(r => r.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(r => r.Label).HasColumnName("label").HasMaxLength(200).IsRequired();
        builder.Property(r => r.Description).HasColumnName("description");

        builder.HasIndex(r => r.Name).IsUnique().HasDatabaseName("uq_role_types_name");
    }
}
