using ByteAI.Gateway.HealthChecks;
using ByteAI.Gateway.Middleware;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Serilog;
using Yarp.ReverseProxy.Configuration;

// ── Serilog bootstrap ────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Sinks are declared in appsettings.*.json — do NOT add WriteTo.Console() here
    // or every log line will be emitted twice (one per sink).
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext());

    // ── CORS — allow the SWA frontend origin ────────────────────────────────
    var allowedOrigins = (builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:3000")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(policy =>
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials()));

    // ── YARP reverse proxy ───────────────────────────────────────────────────
    // Upstream URL is set via ApiUpstreamUrl config (env var from Container Apps).
    // Within the Container Apps environment, the API is reachable by its app name.
    var apiUrl = builder.Configuration["ApiUpstreamUrl"] ?? "http://byteai-api:8080";

    builder.Services.AddReverseProxy()
        .LoadFromMemory(
            routes:
            [
                // SignalR hubs require long-lived connections — must be matched before the
                // catch-all so the hub cluster (no activity timeout) is used instead.
                new RouteConfig
                {
                    RouteId   = "signalr-route",
                    ClusterId = "byteai-api-signalr",
                    Match     = new RouteMatch { Path = "/hubs/{**catch-all}" },
                },
                new RouteConfig
                {
                    RouteId   = "api-route",
                    ClusterId = "byteai-api",
                    Match     = new RouteMatch { Path = "{**catch-all}" },
                }
            ],
            clusters:
            [
                // SignalR cluster: no ActivityTimeout — connection lifetime is managed by the hub.
                new ClusterConfig
                {
                    ClusterId    = "byteai-api-signalr",
                    HttpRequest  = new Yarp.ReverseProxy.Forwarder.ForwarderRequestConfig
                    {
                        ActivityTimeout = Timeout.InfiniteTimeSpan,
                    },
                    Destinations = new Dictionary<string, DestinationConfig>
                    {
                        ["primary"] = new DestinationConfig { Address = apiUrl },
                    },
                },
                new ClusterConfig
                {
                    ClusterId    = "byteai-api",
                    // 60s covers cold starts (min replicas = 0, ACA spin-up ~15-30s)
                    // and AI endpoints (~10-15s). Prevents infinite hangs with no upper bound.
                    HttpRequest  = new Yarp.ReverseProxy.Forwarder.ForwarderRequestConfig
                    {
                        ActivityTimeout = TimeSpan.FromSeconds(60),
                    },
                    Destinations = new Dictionary<string, DestinationConfig>
                    {
                        ["primary"] = new DestinationConfig { Address = apiUrl },
                    },
                }
            ]);

    // ── Health checks ────────────────────────────────────────────────────────
    builder.Services.AddHttpClient<UpstreamHealthCheck>(client =>
        client.Timeout = TimeSpan.FromSeconds(5));

    // upstream-api has no "ready" tag intentionally: the gateway process being
    // alive is sufficient for ACA readiness. Coupling gateway readiness to API
    // health causes cascading failures (API Postgres issue → gateway never starts).
    // The upstream check is still exposed at /health/deep for external monitoring.
    builder.Services.AddHealthChecks()
        .AddCheck<UpstreamHealthCheck>("upstream-api");

    var app = builder.Build();

    app.UseSerilogRequestLogging(opts =>
    {
        // Levels chosen so that in prod (MinimumLevel.Default = Warning) only failed,
        // erroring, or slow requests survive — successful 2xx, OPTIONS preflights,
        // and health probes drop below the threshold and are filtered out.
        opts.GetLevel = (ctx, elapsed, ex) =>
            ex is not null                                   ? Serilog.Events.LogEventLevel.Error
            : ctx.Response.StatusCode >= 500                 ? Serilog.Events.LogEventLevel.Error
            : ctx.Response.StatusCode >= 400                 ? Serilog.Events.LogEventLevel.Warning
            : elapsed > 1000                                 ? Serilog.Events.LogEventLevel.Warning
            : ctx.Request.Method == "OPTIONS"                ? Serilog.Events.LogEventLevel.Verbose
            : ctx.Request.Path.StartsWithSegments("/health") ? Serilog.Events.LogEventLevel.Verbose
            : Serilog.Events.LogEventLevel.Information;
    });
    app.UseCors();

    // API-key / JWT gate — evaluated before YARP forwards the request
    app.UseMiddleware<ApiKeyMiddleware>();

    // Liveness: process is alive — no dependency checks
    app.MapHealthChecks("/health/live", new HealthCheckOptions
    {
        Predicate = _ => false,
    });

    // Readiness: gateway process can accept requests — NOT dependent on API health.
    // Decoupled intentionally: API Postgres failures must not prevent gateway from starting.
    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = _ => false,
    });

    // Deep: upstream API reachability check — for external monitoring/alerting only.
    // Not used by ACA probes. Hit this from Grafana/alerts to detect API outages.
    app.MapHealthChecks("/health/deep", new HealthCheckOptions
    {
        Predicate = c => c.Name == "upstream-api",
    });

    app.MapReverseProxy();

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Gateway terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
