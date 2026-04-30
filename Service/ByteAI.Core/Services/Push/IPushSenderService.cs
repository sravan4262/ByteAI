namespace ByteAI.Core.Services.Push;

/// <summary>
/// Sends a single push to a single device. The dispatcher iterates the
/// recipient's <c>device_tokens</c> rows and calls this once per token.
/// </summary>
public interface IPushSenderService
{
    /// <summary>
    /// Sends one push. Returns a <see cref="PushSendResult"/> the dispatcher
    /// uses to decide whether the token row should be deleted (BadDeviceToken
    /// / Unregistered) or retried later (transient).
    /// </summary>
    Task<PushSendResult> SendAsync(string deviceToken, PushPayload payload, CancellationToken ct);
}

public enum PushSendOutcome
{
    /// <summary>Apple accepted the push (HTTP 200).</summary>
    Sent,
    /// <summary>The device token is no longer valid — delete the row.</summary>
    InvalidToken,
    /// <summary>Network error, throttling, or 5xx — leave the row, will retry next event.</summary>
    Transient,
    /// <summary>Service is misconfigured (missing keys). Caller should stop calling.</summary>
    NotConfigured,
}

public sealed record PushSendResult(PushSendOutcome Outcome, string? Reason = null);
