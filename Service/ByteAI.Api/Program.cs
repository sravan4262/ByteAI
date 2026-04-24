using ByteAI.Api.Common.Auth;
using ByteAI.Api.HealthChecks;
using ByteAI.Core.Business;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.AI;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
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
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

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
    builder.Services.AddScoped<IReactionsBusiness, ReactionsBusiness>();
    builder.Services.AddScoped<IAdminBusiness, AdminBusiness>();
    builder.Services.AddScoped<IDraftsBusiness, DraftsBusiness>();
    builder.Services.AddScoped<ISupportService, SupportService>();
    builder.Services.AddScoped<ISupportBusiness, SupportBusiness>();

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
    var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:3000";
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(policy =>
            policy.WithOrigins(allowedOrigin)
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
        // Suppress health-check noise — they poll every few seconds and fill the logs
        opts.GetLevel = (ctx, _, _) =>
            ctx.Request.Path.StartsWithSegments("/health")
                ? Serilog.Events.LogEventLevel.Debug
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
