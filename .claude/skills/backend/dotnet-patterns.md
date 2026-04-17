---
name: dotnet-patterns
description: Idiomatic C# and .NET patterns, conventions, dependency injection, async/await, and best practices for building robust, maintainable .NET applications.
origin: ECC
---

# .NET Development Patterns

Idiomatic C# and .NET patterns for building robust, performant, and maintainable applications.

## When to Activate

- Writing new C# code
- Reviewing C# code
- Refactoring existing .NET applications
- Designing service architectures with ASP.NET Core

## Core Principles

### 1. Prefer Immutability

Use records and init-only properties for data models. Mutability should be an explicit, justified choice.

```csharp
// Good: Immutable value object
public sealed record Money(decimal Amount, string Currency);

// Good: Immutable DTO with init setters
public sealed class CreateOrderRequest
{
    public required string CustomerId { get; init; }
    public required IReadOnlyList<OrderItem> Items { get; init; }
}

// Bad: Mutable model with public setters
public class Order
{
    public string CustomerId { get; set; }
    public List<OrderItem> Items { get; set; }
}
```

### 2. Explicit Over Implicit

Be clear about nullability, access modifiers, and intent.

```csharp
// Good: Explicit access modifiers and nullability
public sealed class UserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository repository, ILogger<UserService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<User?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _repository.FindByIdAsync(id, cancellationToken);
    }
}
```

### 3. Depend on Abstractions

Use interfaces for service boundaries. Register via DI container.

```csharp
// Good: Interface-based dependency
public interface IOrderRepository
{
    Task<Order?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<Order>> FindByCustomerAsync(string customerId, CancellationToken cancellationToken);
    Task AddAsync(Order order, CancellationToken cancellationToken);
}

// Registration
builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
```

## Async/Await Patterns

### Proper Async Usage

```csharp
// Good: Async all the way, with CancellationToken
public async Task<OrderSummary> GetOrderSummaryAsync(
    Guid orderId,
    CancellationToken cancellationToken)
{
    var order = await _repository.FindByIdAsync(orderId, cancellationToken)
        ?? throw new NotFoundException($"Order {orderId} not found");

    var customer = await _customerService.GetAsync(order.CustomerId, cancellationToken);

    return new OrderSummary(order, customer);
}

// Bad: Blocking on async
public OrderSummary GetOrderSummary(Guid orderId)
{
    var order = _repository.FindByIdAsync(orderId, CancellationToken.None).Result; // Deadlock risk
    return new OrderSummary(order);
}
```

### Parallel Async Operations

```csharp
// Good: Concurrent independent operations
public async Task<DashboardData> LoadDashboardAsync(CancellationToken cancellationToken)
{
    var ordersTask = _orderService.GetRecentAsync(cancellationToken);
    var metricsTask = _metricsService.GetCurrentAsync(cancellationToken);
    var alertsTask = _alertService.GetActiveAsync(cancellationToken);

    await Task.WhenAll(ordersTask, metricsTask, alertsTask);

    return new DashboardData(
        Orders: await ordersTask,
        Metrics: await metricsTask,
        Alerts: await alertsTask);
}
```

## Options Pattern

Bind configuration sections to strongly-typed objects.

```csharp
public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public required string Host { get; init; }
    public required int Port { get; init; }
    public required string Username { get; init; }
    public bool UseSsl { get; init; } = true;
}

// Registration
builder.Services.Configure<SmtpOptions>(
    builder.Configuration.GetSection(SmtpOptions.SectionName));

// Usage via injection
public class EmailService(IOptions<SmtpOptions> options)
{
    private readonly SmtpOptions _smtp = options.Value;
}
```

## Result Pattern

Return explicit success/failure instead of throwing for expected failures.

```csharp
public sealed record Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }

    private Result(T value) { IsSuccess = true; Value = value; }
    private Result(string error) { IsSuccess = false; Error = error; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error) => new(error);
}

// Usage
public async Task<Result<Order>> PlaceOrderAsync(CreateOrderRequest request)
{
    if (request.Items.Count == 0)
        return Result<Order>.Failure("Order must contain at least one item");

    var order = Order.Create(request);
    await _repository.AddAsync(order, CancellationToken.None);
    return Result<Order>.Success(order);
}
```

## Repository Pattern with EF Core

```csharp
public sealed class SqlOrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;

    public SqlOrderRepository(AppDbContext db) => _db = db;

    public async Task<Order?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _db.Orders
            .Include(o => o.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Order>> FindByCustomerAsync(
        string customerId,
        CancellationToken cancellationToken)
    {
        return await _db.Orders
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Order order, CancellationToken cancellationToken)
    {
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
```

## Middleware and Pipeline

```csharp
// Custom middleware
public sealed class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            _logger.LogInformation(
                "Request {Method} {Path} completed in {ElapsedMs}ms with status {StatusCode}",
                context.Request.Method,
                context.Request.Path,
                stopwatch.ElapsedMilliseconds,
                context.Response.StatusCode);
        }
    }
}
```

## Minimal API Patterns

```csharp
// Organized with route groups
var orders = app.MapGroup("/api/orders")
    .RequireAuthorization()
    .WithTags("Orders");

orders.MapGet("/{id:guid}", async (
    Guid id,
    IOrderRepository repository,
    CancellationToken cancellationToken) =>
{
    var order = await repository.FindByIdAsync(id, cancellationToken);
    return order is not null
        ? TypedResults.Ok(order)
        : TypedResults.NotFound();
});

orders.MapPost("/", async (
    CreateOrderRequest request,
    IOrderService service,
    CancellationToken cancellationToken) =>
{
    var result = await service.PlaceOrderAsync(request, cancellationToken);
    return result.IsSuccess
        ? TypedResults.Created($"/api/orders/{result.Value!.Id}", result.Value)
        : TypedResults.BadRequest(result.Error);
});
```

## Guard Clauses

```csharp
// Good: Early returns with clear validation
public async Task<ProcessResult> ProcessPaymentAsync(
    PaymentRequest request,
    CancellationToken cancellationToken)
{
    ArgumentNullException.ThrowIfNull(request);

    if (request.Amount <= 0)
        throw new ArgumentOutOfRangeException(nameof(request.Amount), "Amount must be positive");

    if (string.IsNullOrWhiteSpace(request.Currency))
        throw new ArgumentException("Currency is required", nameof(request.Currency));

    // Happy path continues here without nesting
    var gateway = _gatewayFactory.Create(request.Currency);
    return await gateway.ChargeAsync(request, cancellationToken);
}
```

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| `async void` methods | Return `Task` (except event handlers) |
| `.Result` or `.Wait()` | Use `await` |
| `catch (Exception) { }` | Handle or rethrow with context |
| `new Service()` in constructors | Use constructor injection |
| `public` fields | Use properties with appropriate accessors |
| `dynamic` in business logic | Use generics or explicit types |
| Mutable `static` state | Use DI scoping or `ConcurrentDictionary` |
| `string.Format` in loops | Use `StringBuilder` or interpolated string handlers |

---

## ByteAI-Specific Patterns

These patterns are specific to the ByteAI solution structure. Follow them in all backend code.

### Solution Project Layout

ByteAI uses 3 projects with a strict dependency direction:

```
ByteAI.Api  →  ByteAI.Core   (Api depends on Core; Core never depends on Api)
ByteAI.Tests → ByteAI.Core
ByteAI.Tests → ByteAI.Api
```

| Project | Role | Key contents |
|---|---|---|
| `ByteAI.Api` | HTTP surface | Controllers, ViewModels, Mappers |
| `ByteAI.Core` | Domain + app logic | Entities, Configurations, Validators, Services, Commands, Events, Infrastructure |
| `ByteAI.Tests` | All tests | Unit + integration |

### Table-First with EF Core (No Migrations)

ByteAI uses a **table-first** approach. Tables are defined as SQL scripts in `supabase/tables/`.
EF Core only _reads_ — it never creates or alters tables. There are no EF Core migrations and no `__EFMigrationsHistory`.

**Rules:**
- Never run `dotnet ef migrations add` or `dotnet ef database update`
- Never call `Database.MigrateAsync()` or `Database.EnsureCreatedAsync()` in `Program.cs`
- Schema changes always go in a new `supabase/tables/<table>.sql` file first, then pushed via `supabase db push`
- `AppDbContext` only wires up `IEntityTypeConfiguration<T>` classes; it does nothing else on startup

```csharp
// ByteAI.Core/Infrastructure/Persistence/AppDbContext.cs
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Byte> Bytes => Set<Byte>();
    // ... all entity sets

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all IEntityTypeConfiguration<T> in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        modelBuilder.HasPostgresExtension("vector");
    }
}
```

### ViewModel Pattern (ByteAI.Api/ViewModels/)

ViewModels are immutable `record` types. Request records use `required` properties. Response records are always positive — they do not expose internal IDs or entity internals unnecessary for the client.

```csharp
// ByteAI.Api/ViewModels/ByteViewModels.cs

// Request
public sealed record CreateByteRequest
{
    public required string Title { get; init; }
    public required string Body { get; init; }
    public string? CodeSnippet { get; init; }
    public string? Language { get; init; }
    public string[] Tags { get; init; } = [];
    public string Type { get; init; } = "byte";
}

// Response
public sealed record ByteResponse(
    Guid Id,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string[] Tags,
    int LikeCount,
    int CommentCount,
    int BookmarkCount,
    DateTimeOffset CreatedAt
);
```

### Mapper Pattern (ByteAI.Api/Mappers/)

Mappers are static extension methods only — no instances, no DI, no AutoMapper.
Always have two directions: `ToEntity()` (for writes) and `ToResponse()` (for reads).

```csharp
// ByteAI.Api/Mappers/ByteMappers.cs
public static class ByteMappers
{
    public static Byte ToEntity(this CreateByteRequest request, string authorId) =>
        new()
        {
            Id = Guid.NewGuid(),
            AuthorId = Guid.Parse(authorId),
            Title = request.Title,
            Body = request.Body,
            CodeSnippet = request.CodeSnippet,
            Language = request.Language,
            Tags = request.Tags,
            Type = request.Type,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

    public static ByteResponse ToResponse(this Byte entity) =>
        new(
            Id: entity.Id,
            Title: entity.Title,
            Body: entity.Body,
            CodeSnippet: entity.CodeSnippet,
            Language: entity.Language,
            Tags: entity.Tags,
            LikeCount: entity.LikeCount,
            CommentCount: entity.CommentCount,
            BookmarkCount: entity.BookmarkCount,
            CreatedAt: entity.CreatedAt
        );
}
```

### Controller Pattern (ByteAI.Api/Controllers/)

Controllers dispatch via MediatR — they do NOT contain business logic. They:
1. Validate the request (FluentValidation auto-validated via `[ApiController]`)
2. Map ViewModel → Command via mapper
3. Send command via `IMediator`
4. Map result → ViewModel response

```csharp
// ByteAI.Api/Controllers/BytesController.cs
[ApiController]
[Route("api/bytes")]
public sealed class BytesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetBytes(
        [FromQuery] PaginationParams pagination,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetBytesQuery(pagination), ct);
        return Ok(ApiResponse.Success(result.Select(b => b.ToResponse())));
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateByte(
        [FromBody] CreateByteRequest request,
        CancellationToken ct)
    {
        var authorId = HttpContext.GetSupabaseUserId();
        var command = new CreateByteCommand(request.ToEntity(authorId));
        var created = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetBytes), new { id = created.Id },
            ApiResponse.Success(created.ToResponse()));
    }
}
```

### FluentValidation (ByteAI.Core/Validators/)

Validators live in `ByteAI.Core` and validate business constraints, not database constraints (those are enforced by the SQL schema). Register all validators via assembly scan in `Program.cs`.

```csharp
// ByteAI.Core/Validators/ByteValidator.cs
public sealed class ByteValidator : AbstractValidator<CreateByteCommand>
{
    public ByteValidator()
    {
        RuleFor(x => x.Byte.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(200).WithMessage("Title cannot exceed 200 characters");

        RuleFor(x => x.Byte.Body)
            .NotEmpty().WithMessage("Body is required")
            .MaximumLength(2000).WithMessage("Body cannot exceed 2000 characters");

        RuleFor(x => x.Byte.Tags)
            .Must(tags => tags.Length <= 5).WithMessage("Maximum 5 tags allowed");
    }
}

// Program.cs registration
builder.Services.AddValidatorsFromAssembly(typeof(ByteValidator).Assembly);
builder.Services.AddFluentValidationAutoValidation();
```

### Database & Schema

- Table SQL lives in `supabase/tables/` — see `backend/db/postgres.md` for full schema conventions, EF Fluent config patterns, pgvector usage, and indexing rules.
- EF Core Fluent configurations live in `ByteAI.Core/Entities/Configurations/` — one file per entity, must match the SQL exactly.
