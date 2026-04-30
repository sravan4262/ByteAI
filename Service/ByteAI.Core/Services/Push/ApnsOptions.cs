namespace ByteAI.Core.Services.Push;

/// <summary>
/// APNs (Apple Push Notification service) configuration. All values come from
/// the Apple Developer Portal (Keys page) and are bound from the
/// <c>Apns:*</c> configuration section. Set them as environment variables in
/// the Container App at deploy time (see ios.testflight.yml / deploy.yml).
/// </summary>
public sealed class ApnsOptions
{
    /// <summary>10-character alphanumeric Key ID from the Apple Developer Portal.</summary>
    public string KeyId { get; set; } = string.Empty;

    /// <summary>10-character Team ID from the Apple Developer Portal.</summary>
    public string TeamId { get; set; } = string.Empty;

    /// <summary>
    /// PEM-encoded contents of the <c>.p8</c> APNs key (including the
    /// <c>-----BEGIN PRIVATE KEY-----</c> / <c>-----END PRIVATE KEY-----</c>
    /// envelope). Stored as a single secret; never committed to source.
    /// </summary>
    public string KeyP8 { get; set; } = string.Empty;

    /// <summary>App bundle ID — sent as <c>apns-topic</c> on every request.</summary>
    public string BundleId { get; set; } = "com.byteai.app";

    /// <summary>
    /// "production" → <c>api.push.apple.com</c>; "development" →
    /// <c>api.sandbox.push.apple.com</c>. TestFlight builds and App Store
    /// builds both use production. Local Xcode debug builds use development.
    /// </summary>
    public string Environment { get; set; } = "development";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(KeyId) &&
        !string.IsNullOrWhiteSpace(TeamId) &&
        !string.IsNullOrWhiteSpace(KeyP8) &&
        !string.IsNullOrWhiteSpace(BundleId);

    public string Host =>
        string.Equals(Environment, "production", StringComparison.OrdinalIgnoreCase)
            ? "api.push.apple.com"
            : "api.sandbox.push.apple.com";
}
