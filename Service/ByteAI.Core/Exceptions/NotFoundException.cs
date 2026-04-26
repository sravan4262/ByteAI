namespace ByteAI.Core.Exceptions;

/// <summary>
/// Thrown by app code when a requested resource cannot be found and the message is safe to surface
/// to clients. Use this instead of <see cref="KeyNotFoundException"/> so that the global exception
/// middleware knows the message has been intentionally authored for end-user display
/// (KeyNotFoundException messages can leak internal IDs or table names from EF/dictionary lookups).
/// </summary>
public sealed class NotFoundException(string message)
    : Exception(message);
