namespace ByteAI.Core.Exceptions;

/// <summary>
/// Thrown when a required downstream service (e.g. Gemini) is temporarily unavailable
/// or rate-limited. Maps to HTTP 503 so the client can retry.
/// </summary>
public sealed class ServiceUnavailableException(string message) : Exception(message);
