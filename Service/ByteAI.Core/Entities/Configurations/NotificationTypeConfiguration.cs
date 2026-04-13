using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class NotificationTypeConfiguration : IEntityTypeConfiguration<NotificationType>
{
    public void Configure(EntityTypeBuilder<NotificationType> builder)
    {
        builder.ToTable("notification_types", "users");

        builder.HasKey(nt => nt.Key);
        builder.Property(nt => nt.Key).HasColumnName("key").HasMaxLength(50);
        builder.Property(nt => nt.Label).HasColumnName("label").HasMaxLength(100).IsRequired();
        builder.Property(nt => nt.IconName).HasColumnName("icon_name").HasMaxLength(50);
    }
}
