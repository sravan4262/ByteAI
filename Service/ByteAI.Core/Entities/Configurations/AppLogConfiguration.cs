using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class AppLogConfiguration : IEntityTypeConfiguration<AppLog>
{
    public void Configure(EntityTypeBuilder<AppLog> builder)
    {
        builder.ToTable("logs", "users");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(l => l.Level).HasColumnName("level").IsRequired();
        builder.Property(l => l.Message).HasColumnName("message").IsRequired();
        builder.Property(l => l.Exception).HasColumnName("exception");
        builder.Property(l => l.Source).HasColumnName("source");
        builder.Property(l => l.UserId).HasColumnName("user_id");
        builder.Property(l => l.RequestPath).HasColumnName("request_path");
        builder.Property(l => l.Properties).HasColumnName("properties");
        builder.Property(l => l.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasIndex(l => l.Level).HasDatabaseName("ix_logs_level");
        builder.HasIndex(l => l.CreatedAt).HasDatabaseName("ix_logs_created_at").IsDescending();
    }
}
