namespace ByteAI.Core.Exceptions;

/// <summary>
/// Thrown when submitted content fails tech-relevance or anti-gibberish validation.
/// Callers should surface this as a 400 Bad Request with the reason message.
/// </summary>
public sealed class InvalidContentException(string reason)
    : Exception(reason)
{
    public string Reason { get; } = reason;
}
