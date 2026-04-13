using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class SocialConfiguration : IEntityTypeConfiguration<Social>
{
    public void Configure(EntityTypeBuilder<Social> builder)
    {
        builder.ToTable("usersocials", "users");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(s => s.Platform).HasColumnName("platform").IsRequired();
        builder.Property(s => s.Url).HasColumnName("url").IsRequired();
        builder.Property(s => s.Label).HasColumnName("label");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(s => s.User).WithMany(u => u.Socials)
            .HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.UserId).HasDatabaseName("ix_usersocials_user_id");
        builder.HasIndex(s => new { s.UserId, s.Platform }).IsUnique().HasDatabaseName("uq_usersocials_user_platform");
    }
}
