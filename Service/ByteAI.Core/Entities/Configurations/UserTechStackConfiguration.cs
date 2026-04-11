using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserTechStackConfiguration : IEntityTypeConfiguration<UserTechStack>
{
    public void Configure(EntityTypeBuilder<UserTechStack> builder)
    {
        builder.ToTable("user_tech_stacks", "users");
        builder.HasKey(u => new { u.UserId, u.TechStackId });
        builder.Property(u => u.UserId).HasColumnName("user_id");
        builder.Property(u => u.TechStackId).HasColumnName("tech_stack_id");
        builder.Property(u => u.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(u => u.User).WithMany(user => user.UserTechStacks)
            .HasForeignKey(u => u.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(u => u.TechStack).WithMany(t => t.UserTechStacks)
            .HasForeignKey(u => u.TechStackId).OnDelete(DeleteBehavior.Cascade);
    }
}
