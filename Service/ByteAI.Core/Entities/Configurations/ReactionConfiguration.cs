using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class ReactionConfiguration : IEntityTypeConfiguration<Reaction>
{
    public void Configure(EntityTypeBuilder<Reaction> builder)
    {
        builder.ToTable("reactions");

        builder.HasKey(r => new { r.ByteId, r.UserId });
        builder.Property(r => r.ByteId).HasColumnName("byte_id");
        builder.Property(r => r.UserId).HasColumnName("user_id");
        builder.Property(r => r.Type).HasColumnName("type").HasDefaultValue("like");
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(r => r.Byte).WithMany(b => b.Reactions)
            .HasForeignKey(r => r.ByteId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(r => r.User).WithMany(u => u.Reactions)
            .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.UserId).HasDatabaseName("ix_reactions_user_id");
    }
}
