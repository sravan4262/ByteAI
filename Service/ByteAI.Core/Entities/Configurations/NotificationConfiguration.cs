using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notifications");

        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(n => n.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(n => n.Type).HasColumnName("type").IsRequired();
        builder.Property(n => n.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(n => n.Read).HasColumnName("read").HasDefaultValue(false);
        builder.Property(n => n.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(n => n.User).WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => n.UserId).HasDatabaseName("ix_notifications_user_id");
    }
}
