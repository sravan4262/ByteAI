namespace ByteAI.Core.Entities;

public sealed class LevelType
{
    public Guid Id { get; set; }
    public int Level { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int XpRequired { get; set; }
    public string Icon { get; set; } = "⭐";

    // Navigation
    public ICollection<User> Users { get; set; } = [];
}
