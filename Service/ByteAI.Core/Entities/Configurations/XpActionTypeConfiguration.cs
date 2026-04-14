using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class XpActionTypeConfiguration : IEntityTypeConfiguration<XpActionType>
{
    public void Configure(EntityTypeBuilder<XpActionType> builder)
    {
        builder.ToTable("xp_action_types", "lookups");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(x => x.Label).HasColumnName("label").HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(x => x.XpAmount).HasColumnName("xp_amount").IsRequired();
        builder.Property(x => x.MaxPerDay).HasColumnName("max_per_day");
        builder.Property(x => x.IsOneTime).HasColumnName("is_one_time").HasDefaultValue(false);
        builder.Property(x => x.Icon).HasColumnName("icon").HasMaxLength(10).HasDefaultValue("⚡");
        builder.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        builder.HasIndex(x => x.Name).IsUnique();
    }
}
