namespace ByteAI.Core.Entities;

public sealed class Subdomain
{
    public Guid Id { get; set; }
    public Guid DomainId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    // Navigation
    public Domain Domain { get; set; } = null!;
    public ICollection<TechStack> TechStacks { get; set; } = [];
}
