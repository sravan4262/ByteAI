using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserBanHistoryConfiguration : IEntityTypeConfiguration<UserBanHistory>
{
    public void Configure(EntityTypeBuilder<UserBanHistory> builder)
    {
        builder.ToTable("user_ban_history", "moderation");
        builder.HasKey(h => h.Id);

        builder.Property(h => h.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(h => h.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(h => h.Reason).HasColumnName("reason").IsRequired();
        builder.Property(h => h.BannedAt).HasColumnName("banned_at").HasDefaultValueSql("now()");
        builder.Property(h => h.ExpiresAt).HasColumnName("expires_at");
        builder.Property(h => h.BannedBy).HasColumnName("banned_by");
        builder.Property(h => h.LiftedAt).HasColumnName("lifted_at");
        builder.Property(h => h.LiftedBy).HasColumnName("lifted_by");

        builder.HasIndex(h => new { h.UserId, h.BannedAt })
            .HasDatabaseName("idx_ban_history_user")
            .IsDescending(false, true);

        builder.HasIndex(h => h.UserId)
            .HasDatabaseName("idx_ban_history_open")
            .HasFilter("lifted_at IS NULL");
    }
}
