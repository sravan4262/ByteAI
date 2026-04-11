using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class DraftConfiguration : IEntityTypeConfiguration<Draft>
{
    public void Configure(EntityTypeBuilder<Draft> builder)
    {
        builder.ToTable("drafts", "bytes");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(d => d.AuthorId).HasColumnName("author_id").IsRequired();
        builder.Property(d => d.Title).HasColumnName("title");
        builder.Property(d => d.Body).HasColumnName("body");
        builder.Property(d => d.CodeSnippet).HasColumnName("code_snippet");
        builder.Property(d => d.Language).HasColumnName("language");
        builder.Property(d => d.Tags).HasColumnName("tags").HasColumnType("text[]");
        builder.Property(d => d.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(d => d.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        builder.HasOne(d => d.Author).WithMany(u => u.Drafts)
            .HasForeignKey(d => d.AuthorId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(d => d.AuthorId).HasDatabaseName("ix_drafts_author_id");
    }
}
