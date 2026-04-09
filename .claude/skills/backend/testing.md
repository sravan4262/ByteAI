---
name: byteai-testing
description: Comprehensive testing guide for ByteAI — xUnit, Moq, Testcontainers, WebApplicationFactory. Covers unit tests for Commands/Services, integration tests with real Postgres, and TDD workflow.
---

# Testing — ByteAI Backend

ByteAI tests live in `Service/tests/ByteAI.Api.Tests/`. The project references both `ByteAI.Api` and `ByteAI.Core`.

## Test Project Structure

```
Service/tests/ByteAI.Api.Tests/
├── Commands/               # Unit tests for MediatR command handlers
│   ├── Bytes/
│   │   ├── CreateByteCommandHandlerTests.cs
│   │   └── GetBytesQueryHandlerTests.cs
│   ├── Feed/
│   │   └── GetFeedQueryHandlerTests.cs
│   └── Notifications/
│       └── GetNotificationsQueryHandlerTests.cs
├── Services/               # Unit tests for domain services
│   ├── ByteServiceTests.cs
│   ├── FeedServiceTests.cs
│   └── SearchServiceTests.cs
├── Integration/            # Tests against real Postgres via Testcontainers
│   ├── BytesEndpointTests.cs
│   └── SearchEndpointTests.cs
├── Fixtures/
│   ├── DatabaseFixture.cs  # Testcontainers Postgres setup
│   └── WebAppFactory.cs    # WebApplicationFactory with real DB
└── ByteAI.Api.Tests.csproj
```

---

## Required NuGet Packages

```xml
<ItemGroup>
  <PackageReference Include="xunit" Version="2.9.*" />
  <PackageReference Include="xunit.runner.visualstudio" Version="2.8.*" />
  <PackageReference Include="Moq" Version="4.20.*" />
  <PackageReference Include="FluentAssertions" Version="6.12.*" />
  <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.*" />
  <PackageReference Include="Testcontainers.PostgreSql" Version="3.*" />
</ItemGroup>
```

---

## Unit Test — Command Handler

Test command handlers in isolation using Moq for all dependencies.

```csharp
// Commands/Bytes/CreateByteCommandHandlerTests.cs
public sealed class CreateByteCommandHandlerTests
{
    private readonly Mock<AppDbContext> _db = new();
    private readonly Mock<IPublisher> _publisher = new();

    [Fact]
    public async Task Handle_ValidByte_SavesAndPublishesEvent()
    {
        // Arrange
        var bytes = CreateMockDbSet<Byte>();
        _db.Setup(d => d.Bytes).Returns(bytes.Object);
        _db.Setup(d => d.SaveChangesAsync(default)).ReturnsAsync(1);

        var handler = new CreateByteCommandHandler(_db.Object, _publisher.Object);
        var command = new CreateByteCommand(new Byte
        {
            Id = Guid.NewGuid(),
            AuthorId = Guid.NewGuid(),
            Title = "Test Byte",
            Body = "A short tech post",
            Tags = ["csharp"]
        });

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Test Byte");
        _publisher.Verify(p => p.Publish(
            It.IsAny<ByteCreatedEvent>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_DbThrows_PropagatesException()
    {
        // Arrange
        var bytes = CreateMockDbSet<Byte>();
        _db.Setup(d => d.Bytes).Returns(bytes.Object);
        _db.Setup(d => d.SaveChangesAsync(default))
            .ThrowsAsync(new InvalidOperationException("DB error"));

        var handler = new CreateByteCommandHandler(_db.Object, _publisher.Object);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new CreateByteCommand(new Byte()), CancellationToken.None));
    }

    // Helper: creates a Mock<DbSet<T>> that supports Add/SaveChanges
    private static Mock<DbSet<T>> CreateMockDbSet<T>(params T[] data) where T : class
    {
        var list = data.AsQueryable();
        var mockSet = new Mock<DbSet<T>>();
        mockSet.As<IQueryable<T>>().Setup(m => m.Provider).Returns(list.Provider);
        mockSet.As<IQueryable<T>>().Setup(m => m.Expression).Returns(list.Expression);
        mockSet.As<IQueryable<T>>().Setup(m => m.ElementType).Returns(list.ElementType);
        mockSet.As<IQueryable<T>>().Setup(m => m.GetEnumerator()).Returns(list.GetEnumerator());
        return mockSet;
    }
}
```

---

## Unit Test — Service Layer

```csharp
// Services/SearchServiceTests.cs
public sealed class SearchServiceTests
{
    private readonly Mock<AppDbContext> _db = new();
    private readonly Mock<IEmbeddingService> _embedder = new();

    [Fact]
    public async Task SearchAsync_ReturnsRankedResults()
    {
        // Arrange
        var bytes = new List<Byte>
        {
            new() { Id = Guid.NewGuid(), Title = "C# async tips", Body = "Async patterns" },
            new() { Id = Guid.NewGuid(), Title = "Go concurrency", Body = "Goroutines" },
        }.AsQueryable();

        var mockSet = CreateAsyncMockDbSet(bytes);
        _db.Setup(d => d.Bytes).Returns(mockSet.Object);
        _embedder.Setup(e => e.EmbedAsync(It.IsAny<string>(), default))
            .ReturnsAsync(new float[384]);

        var service = new SearchService(_db.Object, _embedder.Object);

        // Act
        var results = await service.SearchAsync("async", 10, null, CancellationToken.None);

        // Assert
        results.Should().NotBeEmpty();
    }
}
```

---

## Unit Test — Event Handler

```csharp
// Tests for event handlers — verify side effects via mocked services
public sealed class ByteCreatedEventHandlerTests
{
    [Fact]
    public async Task Handle_EmbeddingFails_DoesNotThrow()
    {
        // Arrange — embedding service throws
        var embedder = new Mock<IEmbeddingService>();
        embedder.Setup(e => e.EmbedAsync(It.IsAny<string>(), default))
            .ThrowsAsync(new HttpRequestException("ONNX unavailable"));

        var byteService = new Mock<IByteService>();
        var groq = new Mock<IGroqService>();
        var cache = new Mock<RedisFeedCache>();
        var db = new Mock<AppDbContext>();
        var logger = new Mock<ILogger<ByteCreatedEventHandler>>();

        var handler = new ByteCreatedEventHandler(embedder.Object, byteService.Object,
            groq.Object, cache.Object, db.Object, logger.Object);

        var evt = new ByteCreatedEvent(
            ByteId: Guid.NewGuid(),
            AuthorId: Guid.NewGuid(),
            Title: "Test",
            Body: "Body",
            CodeSnippet: null);

        // Act & Assert — handler swallows the exception
        var exception = await Record.ExceptionAsync(() =>
            handler.Handle(evt, CancellationToken.None));

        exception.Should().BeNull();
    }
}
```

---

## Integration Test — WebApplicationFactory + Testcontainers

Integration tests hit a real Postgres container. They test the full stack: HTTP → Controller → MediatR → EF Core → DB.

```csharp
// Fixtures/DatabaseFixture.cs
public sealed class DatabaseFixture : IAsyncLifetime
{
    public PostgreSqlContainer Postgres { get; } = new PostgreSqlBuilder()
        .WithImage("pgvector/pgvector:pg16")
        .WithDatabase("byteai_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public string ConnectionString => Postgres.GetConnectionString();

    public async Task InitializeAsync()
    {
        await Postgres.StartAsync();
        // Run schema SQL files
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        var sqlFiles = Directory.GetFiles("../../../../supabase/tables", "*.sql")
            .OrderBy(f => f);
        foreach (var file in sqlFiles)
        {
            var sql = await File.ReadAllTextAsync(file);
            await using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    public async Task DisposeAsync() => await Postgres.DisposeAsync();
}
```

```csharp
// Fixtures/WebAppFactory.cs
public sealed class ByteAIWebFactory : WebApplicationFactory<Program>, IClassFixture<DatabaseFixture>
{
    private readonly string _connectionString;

    public ByteAIWebFactory(DatabaseFixture fixture)
    {
        _connectionString = fixture.ConnectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Postgres"] = _connectionString,
                ["Ai:OnnxModelPath"] = "",      // Disable ONNX in tests
                ["Ai:GroqApiKey"] = "",           // Disable Groq in tests
                ["Clerk:Authority"] = "https://test.clerk.dev",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace Clerk auth with test auth scheme
            services.AddAuthentication("Test")
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
        });
    }
}
```

```csharp
// Integration/BytesEndpointTests.cs
[Collection("Integration")]
public sealed class BytesEndpointTests : IClassFixture<ByteAIWebFactory>
{
    private readonly HttpClient _client;

    public BytesEndpointTests(ByteAIWebFactory factory)
    {
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Test");
    }

    [Fact]
    public async Task GetBytes_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/bytes?page=1&pageSize=10");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<ByteResponse>>>();
        body.Should().NotBeNull();
        body!.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateByte_ValidRequest_Returns201()
    {
        var request = new CreateByteRequest
        {
            Title = "Integration test byte",
            Body = "This is a test body for integration",
            Tags = ["testing"]
        };

        var response = await _client.PostAsJsonAsync("/api/bytes", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateByte_EmptyTitle_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/bytes", new { Title = "", Body = "valid" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

---

## Test Auth Handler (Bypass Clerk in Tests)

```csharp
// Fixtures/TestAuthHandler.cs
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user_test_123"),
            new Claim("sub", "user_test_123"),
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "Test");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
```

---

## TDD Workflow (Red → Green → Refactor)

```bash
# 1. Write failing test
dotnet test --filter "CreateByte_ValidRequest_Returns201" --logger "console;verbosity=normal"
# → RED: fails because feature doesn't exist

# 2. Implement minimum code to pass
# → GREEN: test passes

# 3. Refactor without breaking tests
dotnet test
# → All green, clean code

# Watch mode for TDD loop
dotnet watch test --project Service/tests/ByteAI.Api.Tests/ByteAI.Api.Tests.csproj
```

---

## FluentValidation Unit Test

```csharp
public sealed class ByteValidatorTests
{
    private readonly ByteValidator _validator = new();

    [Fact]
    public void Validate_EmptyTitle_Fails()
    {
        var result = _validator.Validate(new Byte { Title = "", Body = "valid body" });
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Title");
    }

    [Fact]
    public void Validate_TitleOver200Chars_Fails()
    {
        var result = _validator.Validate(new Byte { Title = new string('a', 201), Body = "body" });
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ValidByte_Passes()
    {
        var result = _validator.Validate(new Byte
        {
            Title = "Valid title",
            Body = "Valid body",
            Tags = ["csharp", "dotnet"]
        });
        result.IsValid.Should().BeTrue();
    }
}
```

---

## Running Tests

```bash
# Run all tests
dotnet test Service/tests/ByteAI.Api.Tests/

# Run only unit tests (skip integration)
dotnet test --filter "Category!=Integration"

# Run specific test class
dotnet test --filter "FullyQualifiedName~CreateByteCommandHandlerTests"

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|---|---|
| Mocking EF Core DbSet with LINQ | Use Testcontainers with a real DB for query tests |
| Testing `Controller` directly without HTTP | Use `WebApplicationFactory` for controller tests |
| Sharing mutable state between tests | Use `IClassFixture` with fresh instances per class |
| Testing implementation details | Test behavior (inputs → outputs), not internal methods |
| Empty catch in event handlers | Verify logger is called with error in tests |
