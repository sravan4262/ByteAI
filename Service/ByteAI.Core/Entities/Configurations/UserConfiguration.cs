using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(u => u.ClerkId).HasColumnName("clerk_id").IsRequired();
        builder.Property(u => u.Username).HasColumnName("username").HasMaxLength(50).IsRequired();
        builder.Property(u => u.DisplayName).HasColumnName("display_name").HasMaxLength(100).IsRequired();
        builder.Property(u => u.Bio).HasColumnName("bio");
        builder.Property(u => u.RoleTitle).HasColumnName("role_title");
        builder.Property(u => u.Company).HasColumnName("company");
        builder.Property(u => u.AvatarUrl).HasColumnName("avatar_url");
        builder.Property(u => u.Level).HasColumnName("level").HasDefaultValue(1);
        builder.Property(u => u.Xp).HasColumnName("xp").HasDefaultValue(0);
        builder.Property(u => u.Streak).HasColumnName("streak").HasDefaultValue(0);
        builder.Property(u => u.Domain).HasColumnName("domain");
        builder.Property(u => u.Seniority).HasColumnName("seniority");
        builder.Property(u => u.TechStack).HasColumnName("tech_stack").HasColumnType("text[]");
        builder.Property(u => u.FeedPreferences).HasColumnName("feed_preferences").HasColumnType("text[]");
        builder.Property(u => u.InterestEmbedding).HasColumnName("interest_embedding").HasColumnType("vector(384)");
        builder.Property(u => u.IsVerified).HasColumnName("is_verified").HasDefaultValue(false);
        builder.Property(u => u.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(u => u.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        builder.HasIndex(u => u.ClerkId).IsUnique().HasDatabaseName("uq_users_clerk_id");
        builder.HasIndex(u => u.Username).IsUnique().HasDatabaseName("uq_users_username");
    }
}
