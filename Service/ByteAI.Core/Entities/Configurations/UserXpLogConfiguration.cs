using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserXpLogConfiguration : IEntityTypeConfiguration<UserXpLog>
{
    public void Configure(EntityTypeBuilder<UserXpLog> builder)
    {
        builder.ToTable("user_xp_log", "users");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(x => x.ActionName).HasColumnName("action_name").HasMaxLength(100).IsRequired();
        builder.Property(x => x.XpAmount).HasColumnName("xp_amount").IsRequired();
        builder.Property(x => x.AwardedAt).HasColumnName("awarded_at").HasDefaultValueSql("now()");

        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.ActionName })
               .HasDatabaseName("ix_user_xp_log_user_action");
        builder.HasIndex(x => x.AwardedAt)
               .HasDatabaseName("ix_user_xp_log_awarded_at");
    }
}
