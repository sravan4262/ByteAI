namespace ByteAI.Gateway.Middleware;

/// <summary>
/// Adds standard browser-defense response headers to every response forwarded by the Gateway.
/// Set headers on <c>OnStarting</c> so they survive the YARP forwarder write-through.
///
/// Notes:
/// - HSTS is only emitted on HTTPS — preventing the header from being meaningful on HTTP and from
///   being incorrectly cached by browsers when running locally over plain HTTP.
/// - CSP is shipped in report-only mode initially. The SPA's actual policy is best authored in the
///   Next.js layer; this is a backstop for any responses the SPA does not own (e.g. error pages).
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext ctx)
    {
        ctx.Response.OnStarting(() =>
        {
            var headers = ctx.Response.Headers;

            if (ctx.Request.IsHttps && !headers.ContainsKey("Strict-Transport-Security"))
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

            if (!headers.ContainsKey("X-Content-Type-Options"))
                headers["X-Content-Type-Options"] = "nosniff";

            if (!headers.ContainsKey("X-Frame-Options"))
                headers["X-Frame-Options"] = "DENY";

            if (!headers.ContainsKey("Referrer-Policy"))
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            if (!headers.ContainsKey("Permissions-Policy"))
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

            if (!headers.ContainsKey("Content-Security-Policy-Report-Only"))
                headers["Content-Security-Policy-Report-Only"] =
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: https:; " +
                    "connect-src 'self' https: wss:; " +
                    "frame-ancestors 'none'; " +
                    "base-uri 'self'";

            return Task.CompletedTask;
        });

        return next(ctx);
    }
}
