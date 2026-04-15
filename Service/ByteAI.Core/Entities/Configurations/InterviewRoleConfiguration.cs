using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class InterviewRoleConfiguration : IEntityTypeConfiguration<InterviewRole>
{
    public void Configure(EntityTypeBuilder<InterviewRole> builder)
    {
        builder.ToTable("roles", "interviews");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.Name).HasColumnName("name").IsRequired();
        builder.Property(r => r.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(r => r.Name).IsUnique();
    }
}
