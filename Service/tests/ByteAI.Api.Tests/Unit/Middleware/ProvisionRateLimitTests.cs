using ByteAI.Gateway.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace ByteAI.Api.Tests.Unit.Middleware;

/// <summary>
/// Tests the IP-based rate limit on POST /api/auth/provision in ApiKeyMiddleware.
/// </summary>
public sealed class ProvisionRateLimitTests
{
    private static IConfiguration EmptyConfig() =>
        new ConfigurationBuilder().Build();

    private static HttpContext MakeContext(
        string method,
        string path,
        string ip = "1.2.3.4",
        bool useForwardedFor = false)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Path   = path;
        ctx.Response.Body  = new System.IO.MemoryStream();

        if (useForwardedFor)
            ctx.Request.Headers["X-Forwarded-For"] = ip;
        else
            ctx.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(ip);

        return ctx;
    }

    [Fact]
    public async Task Provision_WithinLimit_Passes()
    {
        var middleware = new ApiKeyMiddleware(
            _ => Task.CompletedTask,
            EmptyConfig());

        // First 5 requests from same IP should all pass the rate-limit check
        // (they'll get 401 from auth, not 429 from rate limit)
        for (var i = 0; i < 5; i++)
        {
            var ctx = MakeContext(HttpMethods.Post, "/api/auth/provision", "10.0.0.1");
            await middleware.InvokeAsync(ctx);
            Assert.NotEqual(StatusCodes.Status429TooManyRequests, ctx.Response.StatusCode);
        }
    }

    [Fact]
    public async Task Provision_ExceedsLimit_Returns429()
    {
        var middleware = new ApiKeyMiddleware(
            _ => Task.CompletedTask,
            EmptyConfig());

        const string ip = "10.0.0.2";

        // Exhaust the 5-request allowance
        for (var i = 0; i < 5; i++)
        {
            var ctx = MakeContext(HttpMethods.Post, "/api/auth/provision", ip);
            await middleware.InvokeAsync(ctx);
        }

        // 6th request must be rate-limited
        var rejected = MakeContext(HttpMethods.Post, "/api/auth/provision", ip);
        await middleware.InvokeAsync(rejected);

        Assert.Equal(StatusCodes.Status429TooManyRequests, rejected.Response.StatusCode);
    }

    [Fact]
    public async Task Provision_RateLimit_IsolatedPerIp()
    {
        var middleware = new ApiKeyMiddleware(
            _ => Task.CompletedTask,
            EmptyConfig());

        // Exhaust the limit for IP A
        for (var i = 0; i < 5; i++)
        {
            var ctx = MakeContext(HttpMethods.Post, "/api/auth/provision", "10.0.0.10");
            await middleware.InvokeAsync(ctx);
        }

        // IP B should still be within its own independent limit
        var ctxB = MakeContext(HttpMethods.Post, "/api/auth/provision", "10.0.0.11");
        await middleware.InvokeAsync(ctxB);
        Assert.NotEqual(StatusCodes.Status429TooManyRequests, ctxB.Response.StatusCode);
    }

    [Fact]
    public async Task Provision_RateLimit_DoesNotApplyToOtherRoutes()
    {
        var middleware = new ApiKeyMiddleware(
            _ => Task.CompletedTask,
            EmptyConfig());

        const string ip = "10.0.0.20";

        // Exhaust provision limit
        for (var i = 0; i < 5; i++)
        {
            var ctx = MakeContext(HttpMethods.Post, "/api/auth/provision", ip);
            await middleware.InvokeAsync(ctx);
        }

        // A different POST endpoint from the same IP must not be blocked by this limiter
        var otherCtx = MakeContext(HttpMethods.Post, "/api/bytes", ip);
        otherCtx.Request.Headers.Authorization = "Bearer fake-jwt";
        await middleware.InvokeAsync(otherCtx);
        Assert.NotEqual(StatusCodes.Status429TooManyRequests, otherCtx.Response.StatusCode);
    }

    [Fact]
    public async Task Provision_XForwardedFor_UsedAsRateLimitKey()
    {
        var middleware = new ApiKeyMiddleware(
            _ => Task.CompletedTask,
            EmptyConfig());

        const string realIp  = "10.0.0.40";
        const string proxyIp = "172.16.0.1";

        // Exhaust limit for the real client IP via X-Forwarded-For
        for (var i = 0; i < 5; i++)
        {
            var ctx = MakeContext(HttpMethods.Post, "/api/auth/provision", realIp, useForwardedFor: true);
            await middleware.InvokeAsync(ctx);
        }

        // Same real IP — must be rate-limited even though the proxy IP is different
        var rejected = MakeContext(HttpMethods.Post, "/api/auth/provision", realIp, useForwardedFor: true);
        await middleware.InvokeAsync(rejected);
        Assert.Equal(StatusCodes.Status429TooManyRequests, rejected.Response.StatusCode);

        // Different real IP sharing the same proxy IP — must NOT be blocked
        var allowed = MakeContext(HttpMethods.Post, "/api/auth/provision", proxyIp);
        await middleware.InvokeAsync(allowed);
        Assert.NotEqual(StatusCodes.Status429TooManyRequests, allowed.Response.StatusCode);
    }

    [Fact]
    public async Task Provision_RejectedResponse_HasRetryAfterHeader()
    {
        var middleware = new ApiKeyMiddleware(
            _ => Task.CompletedTask,
            EmptyConfig());

        const string ip = "10.0.0.30";

        for (var i = 0; i < 5; i++)
        {
            var ctx = MakeContext(HttpMethods.Post, "/api/auth/provision", ip);
            await middleware.InvokeAsync(ctx);
        }

        var rejected = MakeContext(HttpMethods.Post, "/api/auth/provision", ip);
        await middleware.InvokeAsync(rejected);

        Assert.Equal("3600", rejected.Response.Headers.RetryAfter.ToString());
    }
}
