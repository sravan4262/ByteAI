namespace ByteAI.Gateway.Middleware;

/// <summary>
/// Enforces authentication at the gateway edge before YARP forwards the request.
///
/// Allows:
///   1. /health/* paths — always unauthenticated
///   2. /api/lookup/* — public read-only data, no auth required
///   3. /api/webhooks/* — Clerk webhooks verified by Svix signature inside the API
///   4. Authorization: Bearer &lt;token&gt; — Clerk JWT; the downstream API validates the token
///   5. X-Api-Key: &lt;key&gt; — machine-to-machine; key must be in the ApiKeys config value
///
/// Rejects everything else with 401.
/// </summary>
public sealed class ApiKeyMiddleware(RequestDelegate next, IConfiguration config)
{
    private const string ApiKeyHeader = "X-Api-Key";

    public async Task InvokeAsync(HttpContext ctx)
    {
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

        // Clerk webhooks — verified by Svix signature inside the API, not by API key
        if (ctx.Request.Path.StartsWithSegments("/api/webhooks"))
        {
            await next(ctx);
            return;
        }

        // Clerk JWT passthrough — the downstream API validates the token itself
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
