using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class ByteConfiguration : IEntityTypeConfiguration<Byte>
{
    public void Configure(EntityTypeBuilder<Byte> builder)
    {
        builder.ToTable("bytes", "bytes");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(b => b.AuthorId).HasColumnName("author_id").IsRequired();
        builder.Property(b => b.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(b => b.Body).HasColumnName("body").IsRequired();
        builder.Property(b => b.CodeSnippet).HasColumnName("code_snippet");
        builder.Property(b => b.Language).HasColumnName("language");
        builder.Property(b => b.Embedding).HasColumnName("embedding").HasColumnType("vector(384)");
        builder.Property(b => b.SearchVector).HasColumnName("search_vector").HasColumnType("tsvector");
        builder.Property(b => b.Type).HasColumnName("type").HasDefaultValue("article");
        builder.Property(b => b.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        // search_vector is generated in PostgreSQL — mark as computed so EF never tries to write it
        builder.Property(b => b.SearchVector).ValueGeneratedOnAddOrUpdate();

        builder.HasOne(b => b.Author).WithMany(u => u.Bytes)
            .HasForeignKey(b => b.AuthorId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => b.AuthorId).HasDatabaseName("ix_bytes_author_id");
        builder.HasIndex(b => b.CreatedAt).HasDatabaseName("ix_bytes_created_at").IsDescending();
        builder.HasIndex(b => b.SearchVector).HasMethod("GIN").HasDatabaseName("ix_bytes_search_vector");
    }
}
