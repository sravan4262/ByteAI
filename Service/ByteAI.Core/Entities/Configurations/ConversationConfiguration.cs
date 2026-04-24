using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.ToTable("conversations", "chat");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.ParticipantAId).HasColumnName("participant_a_id").IsRequired();
        builder.Property(c => c.ParticipantBId).HasColumnName("participant_b_id").IsRequired();
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(c => c.LastMessageAt).HasColumnName("last_message_at").HasDefaultValueSql("now()");

        builder.HasOne(c => c.ParticipantA)
            .WithMany()
            .HasForeignKey(c => c.ParticipantAId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.ParticipantB)
            .WithMany()
            .HasForeignKey(c => c.ParticipantBId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => new { c.ParticipantAId, c.LastMessageAt })
            .HasDatabaseName("ix_conversations_participant_a")
            .IsDescending(false, true);

        builder.HasIndex(c => new { c.ParticipantBId, c.LastMessageAt })
            .HasDatabaseName("ix_conversations_participant_b")
            .IsDescending(false, true);
    }
}
