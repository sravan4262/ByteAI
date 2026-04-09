using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ByteAI.Api.Controllers;

/// <summary>
/// Receives Clerk webhooks (user.created / user.updated) and upserts the user record.
/// TODO: Validate svix-signature header using the Clerk webhook secret before processing.
/// </summary>
[ApiController]
[Route("webhooks")]
public sealed class WebhooksController(AppDbContext db) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    [HttpPost("clerk")]
    public async Task<IActionResult> ClerkWebhook(CancellationToken ct)
    {
        // TODO: Validate svix-id, svix-timestamp, svix-signature headers
        // using HMAC-SHA256 of "{timestamp}.{body}" with Clerk:WebhookSecret

        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);

        ClerkEvent? evt;
        try { evt = JsonSerializer.Deserialize<ClerkEvent>(body, JsonOpts); }
        catch { return BadRequest(); }

        if (evt is null) return BadRequest();

        switch (evt.Type)
        {
            case "user.created":
            case "user.updated":
                await UpsertUserAsync(evt.Data, ct);
                break;
            default:
                // Acknowledge unhandled events silently
                break;
        }

        return Ok();
    }

    private async Task UpsertUserAsync(JsonElement data, CancellationToken ct)
    {
        var clerkId = data.GetProperty("id").GetString() ?? string.Empty;
        if (string.IsNullOrEmpty(clerkId)) return;

        var email = data.TryGetProperty("email_addresses", out var emails) &&
                    emails.GetArrayLength() > 0
            ? emails[0].GetProperty("email_address").GetString()
            : null;

        var firstName = data.TryGetProperty("first_name", out var fn) ? fn.GetString() : null;
        var lastName = data.TryGetProperty("last_name", out var ln) ? ln.GetString() : null;
        var imageUrl = data.TryGetProperty("image_url", out var img) ? img.GetString() : null;

        var displayName = string.Join(" ", new[] { firstName, lastName }
            .Where(s => !string.IsNullOrEmpty(s))).Trim();

        if (string.IsNullOrEmpty(displayName) && email is not null)
            displayName = email.Split('@')[0];

        var existing = await db.Users.FirstOrDefaultAsync(u => u.ClerkId == clerkId, ct);

        if (existing is null)
        {
            var username = await GenerateUniqueUsernameAsync(displayName, ct);
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                ClerkId = clerkId,
                Username = username,
                DisplayName = displayName,
                AvatarUrl = imageUrl,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.DisplayName = displayName;
            if (imageUrl is not null) existing.AvatarUrl = imageUrl;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task<string> GenerateUniqueUsernameAsync(string displayName, CancellationToken ct)
    {
        var base_ = string.IsNullOrEmpty(displayName)
            ? "user"
            : new string(displayName.ToLower().Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());

        if (string.IsNullOrEmpty(base_)) base_ = "user";

        var candidate = base_[..Math.Min(base_.Length, 20)];
        var suffix = 0;

        while (await db.Users.AnyAsync(u => u.Username == candidate, ct))
        {
            suffix++;
            candidate = $"{base_[..Math.Min(base_.Length, 16)]}_{suffix}";
        }

        return candidate;
    }

    // ── Internal DTOs ──────────────────────────────────────────────────────────
    private sealed class ClerkEvent
    {
        public string Type { get; set; } = string.Empty;
        public JsonElement Data { get; set; }
    }
}
