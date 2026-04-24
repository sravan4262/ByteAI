using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ByteAI.Core.Entities.Configurations;

public sealed class ConversationParticipantConfiguration : IEntityTypeConfiguration<ConversationParticipant>
{
    public void Configure(EntityTypeBuilder<ConversationParticipant> builder)
    {
        builder.ToTable("conversation_participants", "chat");

        builder.HasKey(cp => new { cp.ConversationId, cp.UserId });
        builder.Property(cp => cp.ConversationId).HasColumnName("conversation_id");
        builder.Property(cp => cp.UserId).HasColumnName("user_id");
        builder.Property(cp => cp.LastReadAt).HasColumnName("last_read_at").HasDefaultValueSql("now()");

        builder.HasOne(cp => cp.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(cp => cp.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(cp => cp.User)
            .WithMany()
            .HasForeignKey(cp => cp.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
