namespace ByteAI.Core.Entities;

public sealed class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ParticipantAId { get; set; }
    public Guid ParticipantBId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

    public User ParticipantA { get; set; } = null!;
    public User ParticipantB { get; set; } = null!;
    public ICollection<Message> Messages { get; set; } = [];
    public ICollection<ConversationParticipant> Participants { get; set; } = [];
}
