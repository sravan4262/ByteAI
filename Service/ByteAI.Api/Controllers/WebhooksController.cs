using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Svix;
using System.Net;
using System.Text.Json;

namespace ByteAI.Api.Controllers;

/// <summary>
/// Receives Clerk webhooks and keeps the local users table in sync.
/// All requests are verified via svix-signature before processing.
/// </summary>
[ApiController] 
[Route("api/webhooks")]
[AllowAnonymous]
[Produces("application/json")]
[Tags("Webhooks")]
public sealed class WebhooksController(
    IUsersBusiness usersBusiness,
    IConfiguration config,
    ILogger<WebhooksController> logger) : ControllerBase
{
    [HttpPost("clerk")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ClerkWebhook(CancellationToken ct)
    {
        var secret = config["Clerk:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            logger.LogWarning("Clerk:WebhookSecret is not configured — rejecting webhook");
            return Unauthorized();
        }

        string body;
        using (var reader = new StreamReader(Request.Body))
            body = await reader.ReadToEndAsync(ct);

        var headers = new WebHeaderCollection();
        foreach (var (key, values) in Request.Headers)
            headers[key] = values.ToString();

        try
        {
            new Webhook(secret).Verify(body, headers);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Clerk webhook signature verification failed");
            return Unauthorized();
        }

        ClerkEvent? evt;
        try { evt = JsonSerializer.Deserialize<ClerkEvent>(body, JsonOpts); }
        catch { return BadRequest(); }

        if (evt is null) return BadRequest();

        switch (evt.Type)
        {
            case "user.created":
            case "user.updated":
                try
                {
                    var (clerkId, displayName, avatarUrl, email) = ParseUserData(evt.Data);
                    if (string.IsNullOrEmpty(clerkId)) return BadRequest();
                    await usersBusiness.SyncClerkUserAsync(clerkId, displayName, avatarUrl, email, ct);
                    logger.LogInformation("Clerk {EventType} — synced user {ClerkId}", evt.Type, clerkId);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Clerk webhook {EventType} — failed to sync user", evt.Type);
                    throw;
                }
                break;

            case "user.deleted":
                try
                {
                    var deletedClerkId = evt.Data.TryGetProperty("id", out var idProp)
                        ? idProp.GetString()
                        : null;
                    if (string.IsNullOrEmpty(deletedClerkId)) return BadRequest();
                    var deleted = await usersBusiness.DeleteClerkUserAsync(deletedClerkId, ct);
                    logger.LogInformation("Clerk user.deleted — {Result} for {ClerkId}",
                        deleted ? "removed user" : "user not found", deletedClerkId);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Clerk webhook user.deleted — failed to delete user");
                    throw;
                }
                break;

            default:
                logger.LogDebug("Clerk webhook: unhandled event type {EventType}", evt.Type);
                break;
        }

        return Ok();
    }

    private static (string clerkId, string displayName, string? avatarUrl, string? email) ParseUserData(JsonElement data)
    {
        try
        {
            var clerkId = data.TryGetProperty("id", out var id) ? id.GetString() ?? string.Empty : string.Empty;

            var firstName = data.TryGetProperty("first_name", out var fn) ? fn.GetString() : null;
            var lastName = data.TryGetProperty("last_name", out var ln) ? ln.GetString() : null;
            var avatarUrl = data.TryGetProperty("image_url", out var img) ? img.GetString() : null;

            var email = data.TryGetProperty("email_addresses", out var emails) && emails.GetArrayLength() > 0
                ? emails[0].GetProperty("email_address").GetString()
                : null;

            var displayName = string.Join(" ", new[] { firstName, lastName }
                .Where(s => !string.IsNullOrEmpty(s))).Trim();

            if (string.IsNullOrEmpty(displayName))
                displayName = email?.Split('@')[0] ?? clerkId;

            return (clerkId, displayName, avatarUrl, email);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to parse Clerk user data: {ex.Message}", ex);
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private sealed class ClerkEvent
    {
        public string Type { get; set; } = string.Empty;
        public JsonElement Data { get; set; }
    }
}
