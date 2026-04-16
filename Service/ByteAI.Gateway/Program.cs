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

    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // ── CORS — allow the SWA frontend origin ────────────────────────────────
    var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:3000";
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(policy =>
            policy.WithOrigins(allowedOrigin)
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
                new RouteConfig
                {
                    RouteId   = "api-route",
                    ClusterId = "byteai-api",
                    Match     = new RouteMatch { Path = "{**catch-all}" },
                }
            ],
            clusters:
            [
                new ClusterConfig
                {
                    ClusterId    = "byteai-api",
                    Destinations = new Dictionary<string, DestinationConfig>
                    {
                        ["primary"] = new DestinationConfig { Address = apiUrl },
                    },
                }
            ]);

    // ── Health checks ────────────────────────────────────────────────────────
    builder.Services.AddHttpClient<UpstreamHealthCheck>(client =>
        client.Timeout = TimeSpan.FromSeconds(5));

    builder.Services.AddHealthChecks()
        .AddCheck<UpstreamHealthCheck>("upstream-api", tags: ["ready"]);

    var app = builder.Build();

    app.UseSerilogRequestLogging(opts =>
    {
        opts.GetLevel = (ctx, _, _) =>
            ctx.Request.Path.StartsWithSegments("/health")
                ? Serilog.Events.LogEventLevel.Debug
                : Serilog.Events.LogEventLevel.Information;
    });
    app.UseCors();

    // API-key / JWT gate — evaluated before YARP forwards the request
    app.UseMiddleware<ApiKeyMiddleware>();

    // Liveness: process is alive — no upstream check
    app.MapHealthChecks("/health/live", new HealthCheckOptions
    {
        Predicate = _ => false,
    });

    // Readiness: upstream API must also be healthy
    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = c => c.Tags.Contains("ready"),
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
