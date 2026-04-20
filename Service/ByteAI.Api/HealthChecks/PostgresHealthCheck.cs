using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;

namespace ByteAI.Api.HealthChecks;

public sealed class PostgresHealthCheck(IConfiguration configuration) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var connStr = configuration.GetConnectionString("Postgres") ?? "";
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(10));

            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync(cts.Token);
            await using var cmd = new NpgsqlCommand("SELECT 1", conn);
            await cmd.ExecuteScalarAsync(cts.Token);
            return HealthCheckResult.Healthy("PostgreSQL reachable");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL unreachable", ex);
        }
    }
}
