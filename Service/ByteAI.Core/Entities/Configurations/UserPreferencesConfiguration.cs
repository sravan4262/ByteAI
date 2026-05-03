using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserPreferencesConfiguration : IEntityTypeConfiguration<UserPreferences>
{
    public void Configure(EntityTypeBuilder<UserPreferences> builder)
    {
        builder.ToTable("user_preferences", "users");

        builder.HasKey(p => p.UserId);
        builder.Property(p => p.UserId).HasColumnName("user_id");
        builder.Property(p => p.Theme).HasColumnName("theme").HasMaxLength(20).HasDefaultValue("dark");
        builder.Property(p => p.Visibility).HasColumnName("visibility").HasMaxLength(20).HasDefaultValue("public");
        builder.Property(p => p.NotifReactions).HasColumnName("notif_reactions").HasDefaultValue(true);
        builder.Property(p => p.NotifComments).HasColumnName("notif_comments").HasDefaultValue(true);
        builder.Property(p => p.NotifFollowers).HasColumnName("notif_followers").HasDefaultValue(true);
        builder.Property(p => p.NotifUnfollows).HasColumnName("notif_unfollows").HasDefaultValue(true);
        builder.Property(p => p.NotifMentions).HasColumnName("notif_mentions").HasDefaultValue(true);
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        builder.HasOne(p => p.User).WithOne()
            .HasForeignKey<UserPreferences>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
