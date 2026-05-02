using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Services.Supabase;

public sealed class SupabaseAdminService(
    HttpClient http,
    IConfiguration config,
    ILogger<SupabaseAdminService> logger) : ISupabaseAdminService
{
    private readonly string _supabaseUrl    = config["Supabase:Url"]            ?? throw new InvalidOperationException("Supabase:Url is not configured");
    private readonly string _serviceRoleKey = config["Supabase:ServiceRoleKey"] ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is not configured");

    public async Task SignOutAllSessionsAsync(string supabaseUserId, CancellationToken ct = default)
    {
        var url = $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{supabaseUserId}/logout";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        AttachAuth(request);

        var response = await http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning(
                "Supabase session sign-out failed for {SupabaseUserId}: {Status} {Body}",
                supabaseUserId, response.StatusCode, body);
            // Non-fatal: deleting auth.users will invalidate sessions regardless
        }
    }

    public async Task DeleteAuthUserAsync(string supabaseUserId, CancellationToken ct = default)
    {
        var url = $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{supabaseUserId}";

        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        AttachAuth(request);

        var response = await http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError(
                "Supabase admin user deletion failed for {SupabaseUserId}: {Status} {Body}",
                supabaseUserId, response.StatusCode, body);

            throw new InvalidOperationException(
                $"Failed to delete Supabase auth user {supabaseUserId}: {response.StatusCode}");
        }

        logger.LogInformation("Deleted Supabase auth.users record for {SupabaseUserId}", supabaseUserId);
    }

    public async Task SetAuthUserBanAsync(string supabaseUserId, TimeSpan? duration, CancellationToken ct = default)
    {
        var url = $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{supabaseUserId}";

        // Supabase accepts ban_duration as either "none" or "<integer>h" (golang
        // time.ParseDuration). For permanent bans we send a very large hour count;
        // the Supabase docs use the same convention.
        string banDuration;
        if (!duration.HasValue || duration.Value.TotalHours <= 0)
        {
            banDuration = "none";
        }
        else if (duration.Value.TotalHours > 876_000)
        {
            // Cap at the Supabase docs' canonical "permanent" value (~100 years).
            banDuration = "876000h";
        }
        else
        {
            banDuration = $"{(long)Math.Ceiling(duration.Value.TotalHours)}h";
        }

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(new { ban_duration = banDuration }),
        };
        AttachAuth(request);

        var response = await http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning(
                "Supabase set ban_duration failed for {SupabaseUserId} (duration={BanDuration}): {Status} {Body}",
                supabaseUserId, banDuration, response.StatusCode, body);
            // Non-fatal: our own user_bans row + BanEnforcementMiddleware still
            // block the user; the Supabase ban_duration is defense-in-depth.
        }
        else
        {
            logger.LogInformation(
                "Supabase ban_duration set to {BanDuration} for {SupabaseUserId}",
                banDuration, supabaseUserId);
        }
    }

    private void AttachAuth(HttpRequestMessage request)
    {
        request.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
        request.Headers.Add("apikey", _serviceRoleKey);
    }
}
