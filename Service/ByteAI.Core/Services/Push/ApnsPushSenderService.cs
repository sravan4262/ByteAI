using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ByteAI.Core.Services.Push;

/// <summary>
/// Apple Push Notification service sender. Talks HTTP/2 to api.push.apple.com
/// (production) or api.sandbox.push.apple.com (development). Auth is a
/// provider JWT (ES256) refreshed every 50 minutes by <see cref="ApnsJwtProvider"/>.
/// </summary>
public sealed class ApnsPushSenderService(
    HttpClient httpClient,
    ApnsJwtProvider jwtProvider,
    IOptions<ApnsOptions> options,
    ILogger<ApnsPushSenderService> logger) : IPushSenderService
{
    private readonly ApnsOptions _options = options.Value;

    public async Task<PushSendResult> SendAsync(string deviceToken, PushPayload payload, CancellationToken ct)
    {
        if (!_options.IsConfigured)
        {
            return new PushSendResult(PushSendOutcome.NotConfigured, "APNs not configured");
        }

        try
        {
            var jwt = await jwtProvider.GetTokenAsync(ct);

            // APNs payload shape: top-level `aps` envelope holds the alert,
            // sound, and badge; everything else (byteId, conversationId, type)
            // is delivered as custom userInfo to AppDelegate.
            var body = BuildBody(payload);

            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"https://{_options.Host}/3/device/{deviceToken}")
            {
                Version = HttpVersion.Version20,
                VersionPolicy = HttpVersionPolicy.RequestVersionExact,
                Content = JsonContent.Create(body),
            };
            request.Headers.Add("authorization", $"bearer {jwt}");
            request.Headers.Add("apns-topic", _options.BundleId);
            // "alert" is what we want for user-visible notifications. "background"
            // would be a silent push (content-available:1) which we don't use.
            request.Headers.Add("apns-push-type", "alert");
            // Priority 10 = deliver immediately. 5 = allow batching.
            request.Headers.Add("apns-priority", "10");

            using var response = await httpClient.SendAsync(request, ct);

            if (response.IsSuccessStatusCode)
            {
                return new PushSendResult(PushSendOutcome.Sent);
            }

            // APNs returns a JSON body like {"reason":"BadDeviceToken"} on errors.
            // The reason is what tells us whether to delete the token row.
            var errorReason = await ReadReasonAsync(response, ct);
            var outcome = ClassifyError(response.StatusCode, errorReason);

            if (outcome == PushSendOutcome.InvalidToken)
            {
                logger.LogInformation(
                    "APNs rejected token (will be removed): {Reason}", errorReason);
            }
            else
            {
                logger.LogWarning(
                    "APNs send failed ({Status}): {Reason}",
                    (int)response.StatusCode, errorReason);
            }
            return new PushSendResult(outcome, errorReason);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Network / DNS / TLS / JWT-key-parse failures all land here. We
            // mark them transient so the token isn't deleted on a flaky link.
            logger.LogError(ex, "APNs send threw");
            return new PushSendResult(PushSendOutcome.Transient, ex.Message);
        }
    }

    private static object BuildBody(PushPayload payload)
    {
        // Build the wire body manually so we can flatten payload.Data into the
        // top-level object alongside `aps`. Anonymous object init order
        // doesn't matter — APNs only requires the `aps` key be present.
        var dict = new Dictionary<string, object?>(payload.Data.Count + 1)
        {
            ["aps"] = new Dictionary<string, object?>
            {
                ["alert"] = new Dictionary<string, string>
                {
                    ["title"] = payload.Title,
                    ["body"] = payload.Body,
                },
                ["sound"] = "default",
                ["badge"] = payload.Badge,
            }
        };
        foreach (var kvp in payload.Data)
        {
            // Don't let custom data overwrite the reserved `aps` key.
            if (kvp.Key == "aps") continue;
            dict[kvp.Key] = kvp.Value;
        }
        return dict;
    }

    private static async Task<string?> ReadReasonAsync(HttpResponseMessage response, CancellationToken ct)
    {
        try
        {
            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("reason", out var reason) &&
                reason.ValueKind == JsonValueKind.String)
            {
                return reason.GetString();
            }
        }
        catch
        {
            // Body wasn't valid JSON / wasn't readable — fall through.
        }
        return response.ReasonPhrase;
    }

    /// <summary>
    /// Maps APNs status code + reason to a delete-or-retry decision.
    /// Reference: developer.apple.com → "Handling Notification Responses from APNs".
    /// </summary>
    private static PushSendOutcome ClassifyError(HttpStatusCode status, string? reason)
    {
        // 410 Gone = the token is permanently invalid (device uninstalled, etc.)
        // 400 with these reasons = also permanently invalid.
        if (status == HttpStatusCode.Gone) return PushSendOutcome.InvalidToken;
        if (status == HttpStatusCode.BadRequest && reason is "BadDeviceToken" or "DeviceTokenNotForTopic")
        {
            return PushSendOutcome.InvalidToken;
        }
        // 403 ExpiredProviderToken means our JWT is stale — refresh next call.
        // Other 4xx/5xx are transient/configurable; either way we don't delete the token.
        return PushSendOutcome.Transient;
    }
}
