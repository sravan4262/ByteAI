using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserBlockConfiguration : IEntityTypeConfiguration<UserBlock>
{
    public void Configure(EntityTypeBuilder<UserBlock> builder)
    {
        builder.ToTable("user_blocks", "moderation");
        builder.HasKey(b => new { b.BlockerId, b.BlockedId });
        builder.Property(b => b.BlockerId).HasColumnName("blocker_id");
        builder.Property(b => b.BlockedId).HasColumnName("blocked_id");
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasIndex(b => b.BlockerId).HasDatabaseName("idx_user_blocks_blocker");
        builder.HasIndex(b => b.BlockedId).HasDatabaseName("idx_user_blocks_blocked");
    }
}
