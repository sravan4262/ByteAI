using ByteAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.ToTable("comments", "bytes");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.ByteId).HasColumnName("byte_id").IsRequired();
        builder.Property(c => c.AuthorId).HasColumnName("author_id").IsRequired();
        builder.Property(c => c.ParentId).HasColumnName("parent_id");
        builder.Property(c => c.Body).HasColumnName("body").IsRequired();
        builder.Property(c => c.VoteCount).HasColumnName("vote_count").HasDefaultValue(0);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasOne(c => c.Byte).WithMany(b => b.Comments)
            .HasForeignKey(c => c.ByteId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(c => c.Author).WithMany(u => u.Comments)
            .HasForeignKey(c => c.AuthorId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(c => c.Parent).WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentId).IsRequired(false).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.ByteId).HasDatabaseName("ix_comments_byte_id");
        builder.HasIndex(c => c.AuthorId).HasDatabaseName("ix_comments_author_id");
    }
}
