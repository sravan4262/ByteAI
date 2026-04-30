using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace ByteAI.Core.Services.Push;

/// <summary>
/// Builds and caches an APNs provider JWT signed with ES256 over the .p8 key.
///
/// APNs requires:
///  • header  → <c>{"alg":"ES256","kid":"&lt;KEY_ID&gt;"}</c>
///  • payload → <c>{"iss":"&lt;TEAM_ID&gt;","iat":&lt;unix_seconds&gt;}</c>
///  • signature → ECDSA P-256 (SHA-256) over the base64url-encoded
///    <c>header.payload</c>, raw {r,s} concatenation (NOT DER).
///
/// Apple rate-limits provider-token regeneration: too many tokens in a short
/// window returns 403 ExpiredProviderToken. Tokens stay valid for up to 60
/// minutes; we cache for 50 to leave a 10-minute buffer.
/// </summary>
public sealed class ApnsJwtProvider(IOptions<ApnsOptions> options) : IDisposable
{
    private readonly ApnsOptions _options = options.Value;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private string? _cachedToken;
    private DateTimeOffset _cachedExpiresAt;
    private ECDsa? _signer;

    /// <summary>
    /// Returns a valid provider JWT, generating a new one if the cache is
    /// expired or empty. Thread-safe via a single semaphore — APNs JWTs are
    /// stateless once issued, so all callers can share the same token.
    /// </summary>
    public async Task<string> GetTokenAsync(CancellationToken ct = default)
    {
        if (_cachedToken is not null && DateTimeOffset.UtcNow < _cachedExpiresAt)
        {
            return _cachedToken;
        }

        await _gate.WaitAsync(ct);
        try
        {
            // Re-check inside the lock — another caller may have refreshed it.
            if (_cachedToken is not null && DateTimeOffset.UtcNow < _cachedExpiresAt)
            {
                return _cachedToken;
            }

            var token = BuildToken();
            _cachedToken = token;
            // Apple says <60 min; we keep 10 minutes of headroom so a request
            // already in flight against the old token still completes safely.
            _cachedExpiresAt = DateTimeOffset.UtcNow.AddMinutes(50);
            return token;
        }
        finally
        {
            _gate.Release();
        }
    }

    private string BuildToken()
    {
        var signer = GetOrCreateSigner();

        var headerJson = JsonSerializer.Serialize(new { alg = "ES256", kid = _options.KeyId });
        var payloadJson = JsonSerializer.Serialize(new
        {
            iss = _options.TeamId,
            iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });

        var header  = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
        var payload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
        var signingInput = $"{header}.{payload}";

        // SignData with hash + raw {r,s} concatenation — APNs rejects DER signatures.
        var signatureBytes = signer.SignData(
            Encoding.UTF8.GetBytes(signingInput),
            HashAlgorithmName.SHA256,
            DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        var signature = Base64UrlEncode(signatureBytes);

        return $"{signingInput}.{signature}";
    }

    private ECDsa GetOrCreateSigner()
    {
        if (_signer is not null) return _signer;

        // ImportFromPem reads the PKCS#8 envelope produced by Apple's .p8 key.
        // Caching the parsed key avoids re-parsing PEM on every refresh and
        // keeps the EC private key in a single managed instance.
        var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(_options.KeyP8);
        _signer = ecdsa;
        return ecdsa;
    }

    private static string Base64UrlEncode(byte[] input) =>
        Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    public void Dispose()
    {
        _signer?.Dispose();
        _gate.Dispose();
    }
}
