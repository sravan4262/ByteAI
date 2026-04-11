namespace ByteAI.Core.Exceptions;

/// <summary>
/// Thrown when a new byte's content is too similar to an existing one.
/// Callers can surface this as a 409 with the duplicate byte's info.
/// Pass force=true to bypass.
/// </summary>
public sealed class DuplicateContentException(Guid existingId, string existingTitle, double similarity)
    : Exception($"Content is {similarity:P0} similar to existing byte '{existingTitle}'")
{
    public Guid ExistingId { get; } = existingId;
    public string ExistingTitle { get; } = existingTitle;
    public double Similarity { get; } = similarity;
}
