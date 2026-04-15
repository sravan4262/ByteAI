using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ByteAI.Gateway.HealthChecks;

/// <summary>
/// Polls the upstream API's /health/ready endpoint.
/// Returns Healthy only when the API is ready to serve traffic.
/// Used as the readiness gate so that the gateway revision is only
/// activated after the API is confirmed healthy.
/// </summary>
public sealed class UpstreamHealthCheck(HttpClient http, IConfiguration config) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var apiUrl   = config["ApiUpstreamUrl"] ?? "http://byteai-api:8080";
            var response = await http.GetAsync($"{apiUrl}/health/ready", cancellationToken);

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy($"Upstream API ready (HTTP {(int)response.StatusCode})")
                : HealthCheckResult.Unhealthy($"Upstream API returned HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Upstream API unreachable", ex);
        }
    }
}
