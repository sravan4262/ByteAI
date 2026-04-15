using ByteAI.Api.Common.Auth;
using ByteAI.Api.HealthChecks;
using ByteAI.Core.Business;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.AI;
using ByteAI.Core.Infrastructure.Cache;
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
using ByteAI.Core.Services.Trending;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Preferences;
using ByteAI.Core.Services.Drafts;
using ByteAI.Core.Services.Avatar;
using ByteAI.Core.Services.Users;
using ByteAI.Core.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Pgvector.EntityFrameworkCore;
using System.Text.Json;

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


    // ── Auth (Clerk JWT) ──────────────────────────────────────────────────────
    builder.Services.AddClerkJwt(builder.Configuration);

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
    builder.Services.AddSingleton<GroqLoadBalancer>();
    builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
    builder.Services.AddHttpClient<IGroqService, GroqService>();

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
    builder.Services.AddScoped<ITrendingService, TrendingService>();
    builder.Services.AddScoped<ILookupService, LookupService>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IBadgeService, BadgeService>();
    builder.Services.AddScoped<IUserPreferencesService, UserPreferencesService>();
    builder.Services.AddScoped<IDraftService, DraftService>();
    builder.Services.AddScoped<ByteAI.Core.Services.FeatureFlags.IFeatureFlagService, ByteAI.Core.Services.FeatureFlags.FeatureFlagService>();
    builder.Services.AddHttpClient<IAvatarService, AvatarService>();

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
    builder.Services.AddScoped<ITrendingBusiness, TrendingBusiness>();
    builder.Services.AddScoped<IAdminBusiness, AdminBusiness>();
    builder.Services.AddScoped<IDraftsBusiness, DraftsBusiness>();

    // ── Redis (optional) ─────────────────────────────────────────────────────
    // RedisFeedCache is always registered so MediatR handlers can inject it as nullable.
    // When Redis is not configured we fall back to a no-op in-memory cache.
    var redisConn = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrEmpty(redisConn))
        builder.Services.AddStackExchangeRedisCache(opt => opt.Configuration = redisConn);
    else
        builder.Services.AddDistributedMemoryCache(); // no-op fallback — keeps IDistributedCache resolvable
    builder.Services.AddScoped<RedisFeedCache>();

    // ── Health checks ─────────────────────────────────────────────────────────
    var pgConnStr = builder.Configuration.GetConnectionString("Postgres") ?? "";
    var hcBuilder = builder.Services.AddHealthChecks()
        .AddNpgsql(pgConnStr, name: "postgres", tags: ["ready"])
        .AddCheck<OnnxModelHealthCheck>("onnx-model", tags: ["ready"]);

    if (!string.IsNullOrEmpty(redisConn))
        hcBuilder.AddRedis(redisConn, name: "redis", tags: ["ready"]);

    // ── CORS ─────────────────────────────────────────────────────────────────
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(policy =>
            policy
                .WithOrigins(builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:3000")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()));

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
                    All protected endpoints require a Clerk JWT passed as:
                    ```
                    Authorization: Bearer <token>
                    ```
                    Obtain the token from your Clerk session (`getToken()` on the frontend).

                    ## Rate Limiting
                    - Global: 120 requests / minute
                    - AI endpoints (`/api/ai/*`): stricter — see individual endpoints
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
                Description = "Clerk-issued JWT. Format: `Bearer <token>`",
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

    // ── Rate limiting ─────────────────────────────────────────────────────────
    builder.Services.AddRateLimiter(opt =>
        opt.AddFixedWindowLimiter("api", limiter =>
        {
            limiter.Window = TimeSpan.FromMinutes(1);
            limiter.PermitLimit = 120;
        }));

    var app = builder.Build();

    // ── Middleware pipeline ───────────────────────────────────────────────────
    app.UseSerilogRequestLogging();

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
