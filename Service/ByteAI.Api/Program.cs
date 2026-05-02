using ByteAI.Api.Common.Auth;
using ByteAI.Api.HealthChecks;
using ByteAI.Api.Logging;
using ByteAI.Core.Business;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.AI;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Moderation;
using MediatR;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Bookmarks;
using ByteAI.Core.Services.Bytes;
using ByteAI.Core.Services.Comments;
using ByteAI.Core.Services.Feed;
using ByteAI.Core.Services.Follow;
using ByteAI.Core.Services.Interviews;
using ByteAI.Core.Services.Lookup;
using ByteAI.Core.Services.Notifications;
using ByteAI.Core.Services.Reactions;
using ByteAI.Core.Services.Search;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Preferences;
using ByteAI.Core.Services.Drafts;
using ByteAI.Core.Services.Avatar;
using ByteAI.Core.Services.Users;
using ByteAI.Core.Services.Support;
using ByteAI.Core.Services.Supabase;
using ByteAI.Core.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Pgvector.EntityFrameworkCore;
using System.Text.Json;

using Microsoft.Extensions.Http.Resilience;
using Polly;
using System.Net;
using Serilog;

// ── Serilog bootstrap ────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ──────────────────────────────────────────────────────────────
    // Sinks are declared in appsettings.*.json — do NOT add WriteTo.Console() here
    // or every log line will be emitted twice (one per sink).
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        // Redacts ?access_token / ?code / ?state values from any string property — protects
        // SignalR JWT tokens (sent via query for SSE/long-polling) and OAuth codes from log storage.
        .Enrich.With<RedactSensitiveQueryEnricher>());

    // ── Database (table-first — NO auto-migrate) ──────────────────────────────
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseNpgsql(
            builder.Configuration.GetConnectionString("Postgres"),
            npgsql => npgsql.UseVector()));


    // ── Auth (Supabase JWT) ───────────────────────────────────────────────────
    builder.Services.AddSupabaseJwt(builder.Configuration);

    // ── Controllers ──────────────────────────────────────────────────────────
    builder.Services.AddControllers();

    // ── MediatR — scan Core assembly for all handlers ─────────────────────────
    builder.Services.AddMediatR(cfg =>
        cfg.RegisterServicesFromAssembly(typeof(AppDbContext).Assembly));

    // ── Content moderation ────────────────────────────────────────────────────
    // Layer 1 (deterministic) always runs. The Gemini moderator runs second for everything
    // Layer 1 didn't already block. Composite handles LLM failure: fail-closed for chat,
    // fail-open everywhere else.
    builder.Services.Configure<ModerationOptions>(builder.Configuration.GetSection("Moderation"));
    builder.Services.AddScoped<Layer1Moderator>();
    builder.Services.AddScoped<GeminiModerator>();
    builder.Services.AddScoped<IModerationService, CompositeModerator>();

    // ── FluentValidation — scan Core assembly for all validators ──────────────
    builder.Services.AddValidatorsFromAssemblyContaining<UserValidator>();
    builder.Services.AddFluentValidationAutoValidation();

    // ── AI infrastructure (ONNX singleton — optional model file) ─────────────
    builder.Services.AddSingleton<OnnxEmbedder>();
    builder.Services.AddSingleton<TechDomainAnchors>();
    builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
    builder.Services.AddHttpClient<ILlmService, GeminiService>()
        .AddStandardResilienceHandler()
        .Configure(options =>
        {
            options.AttemptTimeout.Timeout          = TimeSpan.FromSeconds(20);
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
            options.TotalRequestTimeout.Timeout     = TimeSpan.FromSeconds(45);
            options.Retry.MaxRetryAttempts          = 2;
            options.Retry.BackoffType               = DelayBackoffType.Exponential;
            options.Retry.UseJitter                 = true;
            options.Retry.ShouldHandle = args => args.Outcome switch
            {
                { Exception: HttpRequestException }                      => PredicateResult.True(),
                { Result: { } r } when (int)r.StatusCode >= 500         => PredicateResult.True(),
                { Result: { } r } when (int)r.StatusCode == 429         => PredicateResult.True(),
                _                                                        => PredicateResult.False(),
            };
        });

    // ── Domain services ───────────────────────────────────────────────────────
    builder.Services.AddScoped<IByteService, ByteService>();
    builder.Services.AddScoped<IFeedService, FeedService>();
    builder.Services.AddScoped<ISearchService, SearchService>();
    builder.Services.AddScoped<INotificationService, NotificationService>();
    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    builder.Services.AddScoped<IInterviewService, InterviewService>();
    builder.Services.AddScoped<IBookmarkService, BookmarkService>();
    builder.Services.AddScoped<ICommentService, CommentService>();
    builder.Services.AddScoped<IFollowService, FollowService>();
    builder.Services.AddScoped<IReactionService, ReactionService>();
    builder.Services.AddScoped<ILookupService, LookupService>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IBadgeService, BadgeService>();
    builder.Services.AddScoped<IUserPreferencesService, UserPreferencesService>();
    builder.Services.AddScoped<IDraftService, DraftService>();
    builder.Services.AddScoped<ByteAI.Core.Services.FeatureFlags.IFeatureFlagService, ByteAI.Core.Services.FeatureFlags.FeatureFlagService>();
    builder.Services.AddHttpClient<ISupabaseAdminService, SupabaseAdminService>()
        .AddStandardResilienceHandler()
        .Configure(options =>
        {
            options.AttemptTimeout.Timeout          = TimeSpan.FromSeconds(10);
            options.TotalRequestTimeout.Timeout     = TimeSpan.FromSeconds(20);
            options.Retry.MaxRetryAttempts          = 2;
            options.Retry.BackoffType               = DelayBackoffType.Exponential;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
            options.Retry.ShouldHandle = args => args.Outcome switch
            {
                { Exception: HttpRequestException }              => PredicateResult.True(),
                { Result: { } r } when (int)r.StatusCode >= 500 => PredicateResult.True(),
                _                                                => PredicateResult.False(),
            };
        });

    builder.Services.AddHttpClient<IAvatarService, AvatarService>()
        .AddStandardResilienceHandler()
        .Configure(options =>
        {
            options.AttemptTimeout.Timeout          = TimeSpan.FromSeconds(15);
            options.TotalRequestTimeout.Timeout     = TimeSpan.FromSeconds(30);
            options.Retry.MaxRetryAttempts          = 1;
            options.Retry.BackoffType               = DelayBackoffType.Constant;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
            options.Retry.ShouldHandle = args => args.Outcome switch
            {
                { Exception: HttpRequestException }              => PredicateResult.True(),
                { Result: { } r } when (int)r.StatusCode >= 500 => PredicateResult.True(),
                _                                                => PredicateResult.False(),
            };
        });

    // ── Business layer ────────────────────────────────────────────────────────
    builder.Services.AddScoped<IBytesBusiness, BytesBusiness>();
    builder.Services.AddScoped<IFeedBusiness, FeedBusiness>();
    builder.Services.AddScoped<IInterviewsBusiness, InterviewsBusiness>();
    builder.Services.AddScoped<ISearchBusiness, SearchBusiness>();
    builder.Services.AddScoped<IUsersBusiness, UsersBusiness>();
    builder.Services.AddScoped<IBookmarksBusiness, BookmarksBusiness>();
    builder.Services.AddScoped<ICommentsBusiness, CommentsBusiness>();
    builder.Services.AddScoped<IFollowBusiness, FollowBusiness>();
    builder.Services.AddScoped<ILookupBusiness, LookupBusiness>();
    builder.Services.AddScoped<INotificationsBusiness, NotificationsBusiness>();
    builder.Services.AddScoped<IDevicesBusiness, DevicesBusiness>();
    builder.Services.AddScoped<IReactionsBusiness, ReactionsBusiness>();
    builder.Services.AddScoped<IAdminBusiness, AdminBusiness>();
    builder.Services.AddScoped<IDraftsBusiness, DraftsBusiness>();
    builder.Services.AddScoped<ISupportService, SupportService>();
    builder.Services.AddScoped<ISupportBusiness, SupportBusiness>();

    // ── Chat ──────────────────────────────────────────────────────────────────
    builder.Services.AddScoped<ByteAI.Core.Services.Chat.ChatService>();
    builder.Services.AddSignalR();

    // ── Push notifications (APNs) ─────────────────────────────────────────────
    // Options bound from `Apns:KeyId / TeamId / KeyP8 / BundleId / Environment`
    // (env vars `Apns__KeyId`, `Apns__TeamId`, etc. — set by the deploy workflow
    // from GitHub Secrets).
    builder.Services.Configure<ByteAI.Core.Services.Push.ApnsOptions>(
        builder.Configuration.GetSection("Apns"));

    // JWT provider is a singleton: it caches the parsed ECDsa key + a
    // ~50-minute provider token. Cheap to recreate, but no reason to.
    builder.Services.AddSingleton<ByteAI.Core.Services.Push.ApnsJwtProvider>();

    // HttpClient for APNs. Stays around for the process lifetime — APNs
    // benefits from connection reuse to the same HTTP/2 endpoint.
    builder.Services.AddHttpClient<ByteAI.Core.Services.Push.IPushSenderService, ByteAI.Core.Services.Push.ApnsPushSenderService>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(15);
        client.DefaultRequestVersion = System.Net.HttpVersion.Version20;
        client.DefaultVersionPolicy = System.Net.Http.HttpVersionPolicy.RequestVersionExact;
    });

    // Dispatcher is registered both as the queue facade event handlers see
    // (IPushDispatcher) and as the IHostedService that drains the queue.
    builder.Services.AddSingleton<ByteAI.Core.Services.Push.PushDispatcher>();
    builder.Services.AddSingleton<ByteAI.Core.Services.Push.IPushDispatcher>(sp =>
        sp.GetRequiredService<ByteAI.Core.Services.Push.PushDispatcher>());
    builder.Services.AddHostedService(sp =>
        sp.GetRequiredService<ByteAI.Core.Services.Push.PushDispatcher>());

    // ── Health checks ─────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddCheck<PostgresHealthCheck>("postgres", tags: ["ready"], timeout: TimeSpan.FromSeconds(15))
        .AddCheck<OnnxModelHealthCheck>("onnx-model", tags: ["ready"]);

    // ── OpenAPI + Scalar ─────────────────────────────────────────────────────
    builder.Services.AddOpenApi(options =>
    {
        // Document metadata
        options.AddDocumentTransformer((document, _, _) =>
        {
            document.Info = new OpenApiInfo
            {
                Title = "ByteAI API",
                Version = "v1",
                Description = """
                    **ByteAI** — tech-focused short-content social platform.

                    ## Authentication
                    All protected endpoints require a Supabase JWT passed as:
                    ```
                    Authorization: Bearer <token>
                    ```
                    Obtain the token from your Supabase session (`session.access_token` on the frontend).

                    ## Rate Limiting
                    All limits are per-user (partitioned by Supabase user ID), 10 req/min:
                    - `ai` (sliding window): `/api/ai/ask`, `/api/ai/search-ask`, `/api/ai/format-code`
                    - `write` (fixed window): `POST /api/bytes`, `POST /api/interviews`
                    - `search` (fixed window): `GET /api/search`
                    - `social` (fixed window): reactions, comments, follow
                    """,
                Contact = new OpenApiContact { Name = "ByteAI", Email = "hello@byteai.dev" },
            };

            // Register Bearer security scheme
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, OpenApiSecurityScheme>();
            document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Supabase-issued JWT. Format: `Bearer <token>`",
            };

            return Task.CompletedTask;
        });

        // Automatically attach Bearer requirement to any [Authorize] endpoint
        options.AddOperationTransformer((operation, context, _) =>
        {
            var hasAuthorize = context.Description.ActionDescriptor.EndpointMetadata
                .OfType<AuthorizeAttribute>()
                .Any();

            if (hasAuthorize)
            {
                operation.Security ??= [];
                operation.Security.Add(new OpenApiSecurityRequirement
                {
                    [new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Id = "Bearer",
                            Type = ReferenceType.SecurityScheme,
                        },
                    }] = [],
                });
            }

            return Task.CompletedTask;
        });
    });

    // ── CORS ──────────────────────────────────────────────────────────────────
    // In production the API is internal-only (behind the Gateway) — CORS is enforced
    // by the Gateway. In Development/Local the API is accessed directly by the browser.
    // Validated at startup so a misconfigured Cors:AllowedOrigin (e.g. "*", missing scheme,
    // attacker domain) crashes the process instead of opening credentialed CORS to the wrong origin.
    var allowedOrigins = (builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:3000")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    ValidateCorsOrigins(allowedOrigins);
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(policy =>
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials()));

    // ── Rate limiting ─────────────────────────────────────────────────────────
    // All policies partition by Supabase user ID (sub claim), falling back to IP.
    // "ai" uses a sliding window to prevent burst-at-reset; others use fixed windows.
    builder.Services.AddRateLimiter(opt =>
    {
        opt.OnRejected = async (ctx, ct) =>
        {
            ctx.HttpContext.Response.StatusCode  = StatusCodes.Status429TooManyRequests;
            ctx.HttpContext.Response.ContentType = "application/json";

            if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                ctx.HttpContext.Response.Headers.RetryAfter =
                    ((int)retryAfter.TotalSeconds).ToString();

            await ctx.HttpContext.Response.WriteAsJsonAsync(new
            {
                type   = "https://tools.ietf.org/html/rfc6585#section-4",
                title  = "Too Many Requests",
                status = 429,
                detail = "Rate limit exceeded. Please slow down.",
            }, ct);
        };

        static string PartitionByUser(HttpContext ctx) =>
            ctx.User.FindFirst("sub")?.Value ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        opt.AddPolicy<string>("ai", ctx => RateLimitPartition.GetSlidingWindowLimiter(
            PartitionByUser(ctx),
            _ => new SlidingWindowRateLimiterOptions
            {
                Window            = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                PermitLimit       = 10,
                QueueLimit        = 0,
                AutoReplenishment = true,
            }));

        opt.AddPolicy<string>("write", ctx => RateLimitPartition.GetFixedWindowLimiter(
            PartitionByUser(ctx),
            _ => new FixedWindowRateLimiterOptions
            {
                Window            = TimeSpan.FromMinutes(1),
                PermitLimit       = 10,
                QueueLimit        = 0,
                AutoReplenishment = true,
            }));

        opt.AddPolicy<string>("search", ctx => RateLimitPartition.GetFixedWindowLimiter(
            PartitionByUser(ctx),
            _ => new FixedWindowRateLimiterOptions
            {
                Window            = TimeSpan.FromMinutes(1),
                PermitLimit       = 10,
                QueueLimit        = 0,
                AutoReplenishment = true,
            }));

        opt.AddPolicy<string>("social", ctx => RateLimitPartition.GetFixedWindowLimiter(
            PartitionByUser(ctx),
            _ => new FixedWindowRateLimiterOptions
            {
                Window            = TimeSpan.FromMinutes(1),
                PermitLimit       = 10,
                QueueLimit        = 0,
                AutoReplenishment = true,
            }));

        opt.AddPolicy<string>("support", ctx => RateLimitPartition.GetFixedWindowLimiter(
            PartitionByUser(ctx),
            _ => new FixedWindowRateLimiterOptions
            {
                Window            = TimeSpan.FromMinutes(1),
                PermitLimit       = 5,
                QueueLimit        = 0,
                AutoReplenishment = true,
            }));

        opt.AddPolicy<string>("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
            PartitionByUser(ctx),
            _ => new FixedWindowRateLimiterOptions
            {
                Window            = TimeSpan.FromMinutes(5),
                PermitLimit       = 3,
                QueueLimit        = 0,
                AutoReplenishment = true,
            }));
    });

    var app = builder.Build();

    // ── Middleware pipeline ───────────────────────────────────────────────────
    // Global exception handler must be first — it wraps the entire pipeline
    app.UseMiddleware<ByteAI.Api.Middleware.GlobalExceptionMiddleware>();

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

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "ByteAI API v1");
            options.RoutePrefix = "swagger";
        });
    }

    app.UseCors();
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseMiddleware<ByteAI.Api.Middleware.BanEnforcementMiddleware>();

    // Liveness: process is alive — no dependency checks (fast, never fails)
    app.MapHealthChecks("/health/live", new HealthCheckOptions
    {
        Predicate      = _ => false,
        ResponseWriter = HealthJson.Write,
    });

    // Readiness: all tagged deps must pass before traffic is sent (used by blue-green gate)
    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate      = c => c.Tags.Contains("ready"),
        ResponseWriter = HealthJson.Write,
    });

    // Legacy alias — keeps backwards compatibility
    app.MapGet("/health", () => Results.Redirect("/health/ready"));

    app.MapControllers();
    app.MapHub<ByteAI.Api.Hubs.ChatHub>("/hubs/chat");

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Validates each CORS origin is an absolute http(s) URL with no path/query and (for non-localhost
// hosts) https scheme. Rejects "*" outright — combined with AllowCredentials() it is both
// browser-rejected and insecure, so failing fast is better than silently shipping a broken policy.
static void ValidateCorsOrigins(string[] origins)
{
    if (origins.Length == 0)
        throw new InvalidOperationException("Cors:AllowedOrigin must contain at least one origin.");

    foreach (var origin in origins)
    {
        if (origin == "*")
            throw new InvalidOperationException(
                "Cors:AllowedOrigin cannot contain '*' — wildcard origins are incompatible with AllowCredentials.");

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            throw new InvalidOperationException(
                $"Cors:AllowedOrigin entry '{origin}' is not an absolute URL (expected scheme://host[:port]).");

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            throw new InvalidOperationException(
                $"Cors:AllowedOrigin entry '{origin}' must use http or https scheme.");

        var isLoopback = uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                         || uri.Host == "127.0.0.1"
                         || uri.Host == "::1";
        if (uri.Scheme == Uri.UriSchemeHttp && !isLoopback)
            throw new InvalidOperationException(
                $"Cors:AllowedOrigin entry '{origin}' must use https (http is only allowed for localhost).");

        if (uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
            throw new InvalidOperationException(
                $"Cors:AllowedOrigin entry '{origin}' must not include a path, query, or fragment.");
    }
}
