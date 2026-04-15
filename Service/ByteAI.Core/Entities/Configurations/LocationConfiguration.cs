using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.ToTable("locations", "interviews");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id");
        builder.Property(l => l.Name).HasColumnName("name").IsRequired();
        builder.Property(l => l.Country).HasColumnName("country").HasDefaultValue("United States");
        builder.Property(l => l.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(l => l.Name).IsUnique();
    }
}
