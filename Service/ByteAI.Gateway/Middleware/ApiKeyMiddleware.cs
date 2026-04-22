using System.Threading.RateLimiting;
using Microsoft.Extensions.Caching.Memory;

namespace ByteAI.Gateway.Middleware;

/// <summary>
/// Enforces authentication at the gateway edge before YARP forwards the request.
///
/// Allows:
///   1. /health/* paths — always unauthenticated
///   2. /api/lookup/* — public read-only data, no auth required
///   3. /api/webhooks/* — webhooks verified by signature inside the API
///   4. Authorization: Bearer &lt;token&gt; — Supabase JWT; the downstream API validates the token
///   5. X-Api-Key: &lt;key&gt; — machine-to-machine; key must be in the ApiKeys config value
///
/// Rejects everything else with 401.
/// Also enforces an IP-based rate limit on POST /api/auth/provision (5 req/hour) to prevent account spam.
/// </summary>
public sealed class ApiKeyMiddleware(RequestDelegate next, IConfiguration config)
{
    private const string ApiKeyHeader = "X-Api-Key";

    // Per-IP FixedWindowLimiters for POST /api/auth/provision — 5 requests per hour.
    // MemoryCache evicts inactive IPs after 2 hours, preventing unbounded timer and memory growth.
    private static readonly MemoryCache _provisionLimiters = new(new MemoryCacheOptions());

    private static FixedWindowRateLimiter GetProvisionLimiter(string ip) =>
        _provisionLimiters.GetOrCreate(ip, entry =>
        {
            entry.SlidingExpiration = TimeSpan.FromHours(2);
            return new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
            {
                Window            = TimeSpan.FromHours(1),
                PermitLimit       = 5,
                QueueLimit        = 0,
                AutoReplenishment = true,
            });
        })!;

    // Reads the real client IP, accounting for reverse proxies (Azure Container Apps, NGINX, etc.)
    // that inject X-Forwarded-For. Falls back to the direct connection IP if the header is absent.
    private static string GetClientIp(HttpContext ctx) =>
        ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
        ?? ctx.Connection.RemoteIpAddress?.ToString()
        ?? "unknown";

    public async Task InvokeAsync(HttpContext ctx)
    {
        // IP-based rate limit on account creation — prevents bot account spam
        if (ctx.Request.Method == HttpMethods.Post &&
            ctx.Request.Path.Equals("/api/auth/provision", StringComparison.OrdinalIgnoreCase))
        {
            var ip      = GetClientIp(ctx);
            var limiter = GetProvisionLimiter(ip);
            using var lease = await limiter.AcquireAsync(permitCount: 1);

            if (!lease.IsAcquired)
            {
                ctx.Response.StatusCode  = StatusCodes.Status429TooManyRequests;
                ctx.Response.ContentType = "application/json";
                ctx.Response.Headers.RetryAfter = "3600";
                await ctx.Response.WriteAsync(
                    """{"error":"Too many account creation attempts. Try again in an hour."}""");
                return;
            }
        }

        // Health endpoints are always accessible without auth
        if (ctx.Request.Path.StartsWithSegments("/health"))
        {
            await next(ctx);
            return;
        }

        // Preflight CORS requests must pass through to UseCors — never auth-gate them
        if (ctx.Request.Method == HttpMethods.Options)
        {
            await next(ctx);
            return;
        }

        // Lookup endpoints are public — no auth required
        if (ctx.Request.Path.StartsWithSegments("/api/lookup"))
        {
            await next(ctx);
            return;
        }

        // Webhooks — verified by signature inside the API, not by API key
        if (ctx.Request.Path.StartsWithSegments("/api/webhooks"))
        {
            await next(ctx);
            return;
        }

        // JWT passthrough — the downstream API validates the token itself
        if (ctx.Request.Headers.Authorization.ToString()
                .StartsWith("Bearer ", StringComparison.Ordinal))
        {
            await next(ctx);
            return;
        }

        // API-key auth (machine-to-machine clients)
        var incomingKey = ctx.Request.Headers[ApiKeyHeader].ToString();
        var validKeys   = (config["ApiKeys"] ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (validKeys.Length > 0 && validKeys.Contains(incomingKey))
        {
            await next(ctx);
            return;
        }

        ctx.Response.StatusCode  = StatusCodes.Status401Unauthorized;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync(
            """{"error":"Unauthorized. Provide Authorization: Bearer <token> or X-Api-Key: <key>."}""");
    }
}
