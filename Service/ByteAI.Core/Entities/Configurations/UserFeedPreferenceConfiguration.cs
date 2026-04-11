using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserFeedPreferenceConfiguration : IEntityTypeConfiguration<UserFeedPreference>
{
    public void Configure(EntityTypeBuilder<UserFeedPreference> builder)
    {
        builder.ToTable("user_feed_preferences", "users");
        builder.HasKey(u => new { u.UserId, u.TechStackId });
        builder.Property(u => u.UserId).HasColumnName("user_id");
        builder.Property(u => u.TechStackId).HasColumnName("tech_stack_id");
        builder.Property(u => u.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(u => u.User).WithMany(user => user.UserFeedPreferences)
            .HasForeignKey(u => u.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(u => u.TechStack).WithMany(t => t.UserFeedPreferences)
            .HasForeignKey(u => u.TechStackId).OnDelete(DeleteBehavior.Cascade);
    }
}
