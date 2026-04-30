using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class DeviceTokenConfiguration : IEntityTypeConfiguration<DeviceToken>
{
    public void Configure(EntityTypeBuilder<DeviceToken> builder)
    {
        builder.ToTable("device_tokens", "users");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(d => d.UserId).HasColumnName("user_id");
        builder.Property(d => d.Platform).HasColumnName("platform").HasMaxLength(16);
        builder.Property(d => d.Token).HasColumnName("token");
        builder.Property(d => d.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(d => d.LastSeenAt).HasColumnName("last_seen_at").HasDefaultValueSql("now()");

        // Unique on token alone — matches migration 009 — so the same physical
        // device re-registering under a new account replaces the prior owner.
        builder.HasIndex(d => d.Token).IsUnique().HasDatabaseName("uq_device_tokens_token");
        builder.HasIndex(d => d.UserId).HasDatabaseName("ix_device_tokens_user_id");

        builder.HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
