using ByteAI.Api.Common.Auth;
using ByteAI.Core.Infrastructure.AI;
using ByteAI.Core.Infrastructure.Cache;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Bytes;
using ByteAI.Core.Services.Feed;
using ByteAI.Core.Services.Notifications;
using ByteAI.Core.Services.Search;
using ByteAI.Core.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;
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
    builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
    builder.Services.AddHttpClient<IGroqService, GroqService>();

    // ── Domain services ───────────────────────────────────────────────────────
    builder.Services.AddScoped<IByteService, ByteService>();
    builder.Services.AddScoped<IFeedService, FeedService>();
    builder.Services.AddScoped<ISearchService, SearchService>();
    builder.Services.AddScoped<INotificationService, NotificationService>();

    // ── Redis (optional) — register cache + RedisFeedCache if configured ─────
    var redisConn = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrEmpty(redisConn))
    {
        builder.Services.AddStackExchangeRedisCache(opt => opt.Configuration = redisConn);
        builder.Services.AddScoped<RedisFeedCache>();
    }

    // ── CORS ─────────────────────────────────────────────────────────────────
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(policy =>
            policy
                .WithOrigins(builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:3000")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()));

    // ── OpenAPI ───────────────────────────────────────────────────────────────
    builder.Services.AddOpenApi();

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
        app.MapOpenApi();

    app.UseCors();
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapGet("/health", () => Results.Ok(new { status = "healthy", ts = DateTime.UtcNow }));
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
