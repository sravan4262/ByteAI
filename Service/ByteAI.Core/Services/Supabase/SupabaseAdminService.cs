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
        request.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
        request.Headers.Add("apikey", _serviceRoleKey);

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
        request.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
        request.Headers.Add("apikey", _serviceRoleKey);

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
}
