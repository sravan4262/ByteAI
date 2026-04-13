using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class SubdomainConfiguration : IEntityTypeConfiguration<Subdomain>
{
    public void Configure(EntityTypeBuilder<Subdomain> builder)
    {
        builder.ToTable("subdomains", "lookups");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.DomainId).HasColumnName("domain_id").IsRequired();
        builder.Property(s => s.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(s => s.Label).HasColumnName("label").HasMaxLength(100).IsRequired();
        builder.Property(s => s.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);

        builder.HasOne(s => s.Domain).WithMany(d => d.Subdomains)
            .HasForeignKey(s => s.DomainId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.Name).IsUnique();
        builder.HasIndex(s => s.DomainId).HasDatabaseName("ix_subdomains_domain_id");
    }
}
