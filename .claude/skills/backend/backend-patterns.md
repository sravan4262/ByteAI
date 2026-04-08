---
name: backend-patterns
description: Backend architecture patterns and best practices for ASP.NET Core 8 microservices — repository pattern, service layer, caching, rate limiting, error handling, and background jobs.
origin: ECC (adapted for ByteAI — ASP.NET Core 8)
---

# Backend Development Patterns

Backend architecture patterns and best practices for scalable ASP.NET Core 8 microservices.

## When to Activate

- Designing REST API endpoints in ASP.NET Core 8
- Implementing repository, service, or controller layers
- Optimizing database queries (N+1, indexing, connection pooling)
- Adding caching (Redis, in-memory, HTTP cache headers)
- Setting up background jobs or async processing
- Structuring error handling and validation for APIs
- Building middleware (auth, logging, rate limiting)

## API Design Patterns

### RESTful API Structure

```
# Resource-based URLs
GET    /api/bytes                 # List resources
GET    /api/bytes/{id}            # Get single resource
POST   /api/bytes                 # Create resource
PUT    /api/bytes/{id}            # Replace resource
PATCH  /api/bytes/{id}            # Update resource
DELETE /api/bytes/{id}            # Delete resource

# Query parameters for filtering, sorting, pagination
GET /api/bytes?status=active&sort=createdAt&limit=20&offset=0
```

### Minimal API Endpoint

```csharp
// Program.cs — ASP.NET Core 8 minimal API style
app.MapGet("/api/bytes", async (
    [FromQuery] int limit,
    [FromQuery] int offset,
    IBytesRepository repo) =>
{
    var bytes = await repo.GetAllAsync(limit, offset);
    return Results.Ok(new ApiResponse<IEnumerable<ByteDto>>(bytes));
})
.RequireAuthorization()
.WithName("GetBytes");

app.MapPost("/api/bytes", async (
    [FromBody] CreateByteRequest request,
    IBytesRepository repo,
    IValidator<CreateByteRequest> validator) =>
{
    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid)
        return Results.ValidationProblem(validation.ToDictionary());

    var result = await repo.CreateAsync(request);
    return Results.CreatedAtRoute("GetByte", new { id = result.Id }, result);
})
.RequireAuthorization();
```

### Repository Pattern

```csharp
// Abstract data access logic
public interface IBytesRepository
{
    Task<IEnumerable<ByteDto>> GetAllAsync(int limit = 20, int offset = 0);
    Task<ByteDto?> GetByIdAsync(Guid id);
    Task<ByteDto> CreateAsync(CreateByteRequest request);
    Task<ByteDto> UpdateAsync(Guid id, UpdateByteRequest request);
    Task DeleteAsync(Guid id);
}

public class PostgresBytesRepository : IBytesRepository
{
    private readonly IMongoCollection<ByteDocument> _collection;

    public PostgresBytesRepository(IMongoDatabase db)
    {
        _collection = db.GetCollection<ByteDocument>("bytes");
    }

    public async Task<IEnumerable<ByteDto>> GetAllAsync(int limit = 20, int offset = 0)
    {
        var docs = await _collection
            .Find(FilterDefinition<ByteDocument>.Empty)
            .Skip(offset)
            .Limit(limit)
            .SortByDescending(b => b.CreatedAt)
            .ToListAsync();

        return docs.Select(d => d.ToDto());
    }

    public async Task<ByteDto?> GetByIdAsync(Guid id)
    {
        var doc = await _collection
            .Find(b => b.Id == id.ToString())
            .FirstOrDefaultAsync();

        return doc?.ToDto();
    }
}
```

### Service Layer Pattern

```csharp
// Business logic separated from data access
public class BytesService
{
    private readonly IBytesRepository _bytesRepo;
    private readonly IAiService _aiService;
    private readonly IPublishEndpoint _publisher;

    public BytesService(
        IBytesRepository bytesRepo,
        IAiService aiService,
        IPublishEndpoint publisher)
    {
        _bytesRepo = bytesRepo;
        _aiService = aiService;
        _publisher = publisher;
    }

    public async Task<ByteDto> CreateByteAsync(CreateByteRequest request, string authorId)
    {
        // Business logic: create and publish event
        var byteDto = await _bytesRepo.CreateAsync(request with { AuthorId = authorId });

        // Publish event for AI Service, Feed Service, Search Service
        await _publisher.Publish(new ByteCreatedEvent
        {
            ByteId = byteDto.Id,
            AuthorId = authorId,
            Body = byteDto.Body,
            Tags = byteDto.Tags
        });

        return byteDto;
    }
}
```

### Middleware Pattern

```csharp
// Custom middleware for request context enrichment
public class RequestContextMiddleware
{
    private readonly RequestDelegate _next;

    public RequestContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ILogger<RequestContextMiddleware> logger)
    {
        var requestId = context.TraceIdentifier;
        var userId = context.User.FindFirst("sub")?.Value;

        using var scope = logger.BeginScope(new Dictionary<string, object>
        {
            ["RequestId"] = requestId,
            ["UserId"] = userId ?? "anonymous"
        });

        await _next(context);
    }
}

// Registration in Program.cs
app.UseMiddleware<RequestContextMiddleware>();
```

## Database Patterns

### Query Optimization (Dapper with PostgreSQL)

```csharp
// GOOD: Select only needed columns with parameterized query
public async Task<IEnumerable<UserSummary>> GetActiveUsersAsync()
{
    const string sql = """
        SELECT id, username, level, xp
        FROM users
        WHERE is_active = true
        ORDER BY xp DESC
        LIMIT 50
        """;

    await using var conn = await _dataSource.OpenConnectionAsync();
    return await conn.QueryAsync<UserSummary>(sql);
}

// BAD: SELECT * — never do this
// SELECT * FROM users WHERE is_active = true
```

### N+1 Query Prevention

```csharp
// BAD: N+1 — one extra query per user
var users = await GetUsersAsync();
foreach (var user in users)
{
    user.FollowerCount = await GetFollowerCountAsync(user.Id); // N queries
}

// GOOD: single JOIN query
const string sql = """
    SELECT u.id, u.username, COUNT(f.follower_id) AS follower_count
    FROM users u
    LEFT JOIN follows f ON f.following_id = u.id
    GROUP BY u.id, u.username
    """;

var users = await conn.QueryAsync<UserWithStats>(sql);
```

### Transaction Pattern (EF Core)

```csharp
public async Task CreateByteWithNotificationAsync(
    CreateByteRequest request,
    string authorId)
{
    await using var transaction = await _db.Database.BeginTransactionAsync();

    try
    {
        var byteEntity = new ByteEntity { AuthorId = authorId, Body = request.Body };
        _db.Bytes.Add(byteEntity);
        await _db.SaveChangesAsync();

        var notification = new NotificationEntity
        {
            UserId = authorId,
            Type = NotificationType.BytePublished,
            Payload = JsonSerializer.Serialize(new { ByteId = byteEntity.Id })
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

## Caching Strategies

### Redis Caching Layer (IDistributedCache)

```csharp
public class CachedBytesRepository : IBytesRepository
{
    private readonly IBytesRepository _inner;
    private readonly IDistributedCache _cache;
    private readonly JsonSerializerOptions _json = new();

    public CachedBytesRepository(IBytesRepository inner, IDistributedCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public async Task<ByteDto?> GetByIdAsync(Guid id)
    {
        var cacheKey = $"byte:{id}";
        var cached = await _cache.GetStringAsync(cacheKey);

        if (cached is not null)
            return JsonSerializer.Deserialize<ByteDto>(cached, _json);

        var result = await _inner.GetByIdAsync(id);

        if (result is not null)
        {
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result, _json),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
                });
        }

        return result;
    }

    public async Task InvalidateCacheAsync(Guid id)
    {
        await _cache.RemoveAsync($"byte:{id}");
    }
}
```

### Cache-Aside with StackExchange.Redis

```csharp
public async Task<FeedDto> GetUserFeedAsync(string userId)
{
    var cacheKey = $"feed:{userId}";
    var cached = await _redis.GetDatabase().StringGetAsync(cacheKey);

    if (cached.HasValue)
        return JsonSerializer.Deserialize<FeedDto>(cached!)!;

    var feed = await _feedRepository.BuildFeedAsync(userId);
    await _redis.GetDatabase().StringSetAsync(
        cacheKey,
        JsonSerializer.Serialize(feed),
        TimeSpan.FromMinutes(5));

    return feed;
}
```

## Error Handling Patterns

### Problem Details (RFC 7807)

```csharp
// Register in Program.cs
builder.Services.AddProblemDetails();
app.UseExceptionHandler();

// Custom exception handler
app.UseExceptionHandler(exApp =>
{
    exApp.Run(async context =>
    {
        context.Response.ContentType = "application/problem+json";

        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        var (status, title) = exception switch
        {
            NotFoundException e => (404, e.Message),
            ValidationException e => (400, e.Message),
            UnauthorizedException e => (401, e.Message),
            _ => (500, "An unexpected error occurred")
        };

        context.Response.StatusCode = status;

        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Instance = context.Request.Path
        });
    });
});
```

### Custom Domain Exceptions

```csharp
public class NotFoundException : Exception
{
    public NotFoundException(string resource, object id)
        : base($"{resource} with id '{id}' was not found.") { }
}

public class ForbiddenException : Exception
{
    public ForbiddenException(string message = "You do not have permission.")
        : base(message) { }
}
```

### Retry with Polly

```csharp
// In Program.cs — resilience pipeline for outbound HTTP
builder.Services
    .AddHttpClient<IGroqClient, GroqClient>()
    .AddResilienceHandler("groq-retry", pipeline =>
    {
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromSeconds(1),
            BackoffType = DelayBackoffType.Exponential
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(10));
    });
```

## Authentication & Authorization (Clerk JWT)

### JWT Validation Middleware

```csharp
// Program.cs — validate Clerk-issued JWTs
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Clerk:Authority"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy =>
        policy.RequireRole("admin"));
});
```

### Role-Based Access Control

```csharp
// Policy-based authorization
[Authorize(Policy = "RequireAdmin")]
app.MapDelete("/api/admin/bytes/{id}", async (Guid id, IBytesRepository repo) =>
{
    await repo.DeleteAsync(id);
    return Results.NoContent();
});

// Manual claim check in service
public async Task DeleteByteAsync(Guid byteId, ClaimsPrincipal user)
{
    var userId = user.FindFirst("sub")!.Value;
    var byteDto = await _bytesRepo.GetByIdAsync(byteId)
        ?? throw new NotFoundException("Byte", byteId);

    if (byteDto.AuthorId != userId && !user.IsInRole("admin"))
        throw new ForbiddenException();

    await _bytesRepo.DeleteAsync(byteId);
}
```

## Rate Limiting (ASP.NET Core 8 built-in)

```csharp
// Program.cs — built-in rate limiting (no extra packages needed)
builder.Services.AddRateLimiter(options =>
{
    // Global: 100 req/min per IP
    options.AddFixedWindowLimiter("global", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 100;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiter.QueueLimit = 5;
    });

    // Search: 10 req/min per user (expensive)
    options.AddFixedWindowLimiter("search", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 10;
    });

    options.RejectionStatusCode = 429;
});

app.UseRateLimiter();

// Apply to specific endpoints
app.MapGet("/api/search", SearchHandler).RequireRateLimiting("search");
```

## Background Jobs (MassTransit + RabbitMQ)

### Event Consumer

```csharp
// Handles byte.created events published by Bytes Service
public class ByteCreatedConsumer : IConsumer<ByteCreatedEvent>
{
    private readonly ISearchIndexService _searchIndex;
    private readonly IAiService _aiService;

    public ByteCreatedConsumer(ISearchIndexService searchIndex, IAiService aiService)
    {
        _searchIndex = searchIndex;
        _aiService = aiService;
    }

    public async Task Consume(ConsumeContext<ByteCreatedEvent> context)
    {
        var msg = context.Message;

        // Index for search
        await _searchIndex.IndexByteAsync(msg.ByteId, msg.Body, msg.Tags);

        // Generate embedding
        await _aiService.GenerateAndStoreEmbeddingAsync(msg.ByteId, msg.Body);
    }
}

// Register in Program.cs
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ByteCreatedConsumer>();

    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host(builder.Configuration["RabbitMQ:Host"]);
        cfg.ConfigureEndpoints(ctx);
    });
});
```

### Publishing Events

```csharp
public class BytesService
{
    private readonly IPublishEndpoint _publisher;

    public async Task<ByteDto> CreateByteAsync(CreateByteRequest request)
    {
        var result = await _bytesRepo.CreateAsync(request);

        await _publisher.Publish(new ByteCreatedEvent
        {
            ByteId = result.Id,
            AuthorId = result.AuthorId,
            Body = result.Body,
            Tags = result.Tags,
            CreatedAt = result.CreatedAt
        });

        return result;
    }
}
```

## Logging & Observability (OpenTelemetry)

### Structured Logging with Serilog

```csharp
// Program.cs
builder.Host.UseSerilog((ctx, config) =>
{
    config
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Service", "BytesService")
        .WriteTo.Console(new JsonFormatter());
});

// Usage in service
public class BytesService
{
    private readonly ILogger<BytesService> _logger;

    public async Task<ByteDto> CreateByteAsync(CreateByteRequest request)
    {
        _logger.LogInformation(
            "Creating byte for user {AuthorId} with {TagCount} tags",
            request.AuthorId, request.Tags.Length);

        try
        {
            var result = await _bytesRepo.CreateAsync(request);
            _logger.LogInformation("Byte {ByteId} created successfully", result.Id);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create byte for user {AuthorId}", request.AuthorId);
            throw;
        }
    }
}
```

### OpenTelemetry Tracing

```csharp
// Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddEntityFrameworkCoreInstrumentation()
            .AddRedisInstrumentation()
            .AddOtlpExporter(opts =>
            {
                opts.Endpoint = new Uri(builder.Configuration["Jaeger:Endpoint"]!);
            });
    })
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddPrometheusExporter();
    });
```

**Remember**: Keep services small, consumers fast, and events immutable. Prefer async over sync for anything that crosses service boundaries.
