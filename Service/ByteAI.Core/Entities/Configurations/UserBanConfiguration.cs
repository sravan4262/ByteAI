using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserBanConfiguration : IEntityTypeConfiguration<UserBan>
{
    public void Configure(EntityTypeBuilder<UserBan> builder)
    {
        builder.ToTable("user_bans", "moderation");
        builder.HasKey(b => b.UserId);

        builder.Property(b => b.UserId).HasColumnName("user_id");
        builder.Property(b => b.Reason).HasColumnName("reason").IsRequired();
        builder.Property(b => b.BannedAt).HasColumnName("banned_at").HasDefaultValueSql("now()");
        builder.Property(b => b.ExpiresAt).HasColumnName("expires_at");
        builder.Property(b => b.BannedBy).HasColumnName("banned_by");

        builder.HasOne(b => b.User)
            .WithOne()
            .HasForeignKey<UserBan>(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => b.ExpiresAt)
            .HasDatabaseName("idx_user_bans_expires")
            .HasFilter("expires_at IS NOT NULL");
    }
}
