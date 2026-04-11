using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class ByteTechStackConfiguration : IEntityTypeConfiguration<ByteTechStack>
{
    public void Configure(EntityTypeBuilder<ByteTechStack> builder)
    {
        builder.ToTable("byte_tech_stacks", "bytes");
        builder.HasKey(b => new { b.ByteId, b.TechStackId });
        builder.Property(b => b.ByteId).HasColumnName("byte_id");
        builder.Property(b => b.TechStackId).HasColumnName("tech_stack_id");

        builder.HasOne(b => b.Byte).WithMany(by => by.ByteTechStacks)
            .HasForeignKey(b => b.ByteId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(b => b.TechStack).WithMany(t => t.ByteTechStacks)
            .HasForeignKey(b => b.TechStackId).OnDelete(DeleteBehavior.Cascade);
    }
}
