using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

namespace ByteAI.Api.HealthChecks;

/// <summary>
/// Writes health check results as structured JSON.
/// Example output:
/// { "status": "Healthy", "checks": [ { "name": "postgres", "status": "Healthy", "durationMs": 4.2 } ] }
/// </summary>
internal static class HealthJson
{
    private static readonly JsonSerializerOptions _opts = new() { WriteIndented = false };

    public static Task Write(HttpContext ctx, HealthReport report)
    {
        ctx.Response.ContentType = "application/json";

        var payload = new
        {
            status = report.Status.ToString(),
            durationMs = report.TotalDuration.TotalMilliseconds,
            checks = report.Entries.Select(e => new
            {
                name        = e.Key,
                status      = e.Value.Status.ToString(),
                description = e.Value.Description,
                durationMs  = e.Value.Duration.TotalMilliseconds,
                error       = e.Value.Exception?.Message,
            }),
        };

        return ctx.Response.WriteAsync(JsonSerializer.Serialize(payload, _opts));
    }
}
