namespace ByteAI.Core.Entities;

public sealed class Location
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = "United States";
    public DateTime CreatedAt { get; set; }
}
