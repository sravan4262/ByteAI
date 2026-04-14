namespace ByteAI.Core.Entities;

public sealed class TechStack
{
    public Guid Id { get; set; }
    public Guid SubdomainId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    // Navigation
    public Subdomain Subdomain { get; set; } = null!;
    public ICollection<UserTechStack> UserTechStacks { get; set; } = [];
    public ICollection<ByteTechStack> ByteTechStacks { get; set; } = [];
    public ICollection<InterviewTechStack> InterviewTechStacks { get; set; } = [];
}
