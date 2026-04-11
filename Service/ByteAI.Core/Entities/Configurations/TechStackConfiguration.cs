using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class TechStackConfiguration : IEntityTypeConfiguration<TechStack>
{
    public void Configure(EntityTypeBuilder<TechStack> builder)
    {
        builder.ToTable("tech_stacks", "lookups");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(t => t.DomainId).HasColumnName("domain_id").IsRequired();
        builder.Property(t => t.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(t => t.Label).HasColumnName("label").HasMaxLength(100).IsRequired();
        builder.Property(t => t.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);

        builder.HasOne(t => t.Domain).WithMany(d => d.TechStacks)
            .HasForeignKey(t => t.DomainId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.Name).IsUnique();
        builder.HasIndex(t => t.DomainId).HasDatabaseName("ix_tech_stacks_domain_id");
    }
}
