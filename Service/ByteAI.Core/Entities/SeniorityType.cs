namespace ByteAI.Core.Entities;

public sealed class SeniorityType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    // Navigation
    public ICollection<User> Users { get; set; } = [];
}
