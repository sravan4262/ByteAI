namespace ByteAI.Core.Entities;

public sealed class RoleType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = [];
}
