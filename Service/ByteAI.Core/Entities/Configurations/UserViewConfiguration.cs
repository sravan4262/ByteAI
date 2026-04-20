using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserViewConfiguration : IEntityTypeConfiguration<UserView>
{
    public void Configure(EntityTypeBuilder<UserView> builder)
    {
        builder.ToTable("user_views", "bytes");

        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(v => v.ByteId).HasColumnName("byte_id").IsRequired();
        builder.Property(v => v.UserId).HasColumnName("user_id");
        builder.Property(v => v.ViewedAt).HasColumnName("viewed_at").HasDefaultValueSql("now()");
        builder.Property(v => v.DwellMs).HasColumnName("dwell_ms");

        builder.HasOne(v => v.Byte).WithMany(b => b.UserViews)
            .HasForeignKey(v => v.ByteId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(v => v.User).WithMany()
            .HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(v => v.ByteId).HasDatabaseName("ix_user_views_byte_id");
        builder.HasIndex(v => v.UserId).HasDatabaseName("ix_user_views_user_id");
        builder.HasIndex(v => v.ViewedAt).HasDatabaseName("ix_user_views_viewed_at").IsDescending();
    }
}
