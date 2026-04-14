using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> builder)
    {
        builder.ToTable("user_roles", "users");
        
        builder.HasKey(ur => new { ur.UserId, ur.RoleTypeId });
        
        builder.Property(ur => ur.UserId).HasColumnName("user_id");
        builder.Property(ur => ur.RoleTypeId).HasColumnName("role_type_id");
        builder.Property(ur => ur.AssignedAt).HasColumnName("assigned_at").HasDefaultValueSql("now()");

        builder.HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ur => ur.RoleType)
            .WithMany(rt => rt.UserRoles)
            .HasForeignKey(ur => ur.RoleTypeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
