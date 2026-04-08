---
name: tdd-workflow
description: Test-driven development workflow for ByteAI — xUnit + WebApplicationFactory for ASP.NET Core 8 backend, Jest/Vitest + React Testing Library for React PWA frontend, Playwright for E2E.
origin: ECC (adapted for ByteAI)
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive test coverage.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints
- Creating new components

## Core Principles

### 1. Tests BEFORE Code
ALWAYS write tests first, then implement code to make tests pass.

### 2. Coverage Requirements
- Minimum 80% coverage (unit + integration + E2E)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. Test Types

#### Unit Tests
- Individual service methods and utilities
- Pure business logic
- Domain entities and value objects
- React component rendering and interactions

#### Integration Tests
- API endpoints (WebApplicationFactory for .NET)
- Database operations
- RabbitMQ consumer behavior
- Redis cache interactions

#### E2E Tests (Playwright)
- Critical user flows
- Complete workflows
- Browser automation
- UI interactions

### 4. Git Checkpoints
- Create a checkpoint commit after each TDD stage
- RED commit: `test: add reproducer for <feature>`
- GREEN commit: `fix: <feature>`
- REFACTOR commit: `refactor: clean up <feature> implementation`

---

## TDD Workflow Steps

### Step 1: Write User Journeys

```
As a [role], I want to [action], so that [benefit]

Example:
As a developer, I want to post a Byte (short code snippet),
so that I can share knowledge with the ByteAI community.
```

### Step 2: Generate Test Cases

```csharp
// ByteAI.BytesService.Tests/BytesControllerTests.cs
public class BytesControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    // Test: post byte successfully
    // Test: rejects empty body
    // Test: rejects body over 280 chars
    // Test: requires authentication
    // Test: publishes byte.created event after creation
}
```

### Step 3: Run Tests — They Should Fail (RED)

```bash
# .NET backend
dotnet test src/Services/ByteAI.BytesService.Tests/ --no-build 2>&1 | tail -20

# React frontend
cd client && npm test -- --watchAll=false 2>&1 | tail -20
```

The RED state is mandatory before writing any production code.

### Step 4: Implement Code

Write the minimal code to make tests pass.

### Step 5: Run Tests Again — They Should Pass (GREEN)

```bash
dotnet test ByteAI.sln 2>&1 | tail -20
```

### Step 6: Refactor

Improve code quality while keeping tests green.

### Step 7: Verify Coverage

```bash
# .NET — generate coverage report
dotnet test ByteAI.sln --collect:"XPlat Code Coverage"
dotnet reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:coverage/report -reporttypes:TextSummary
cat coverage/report/Summary.txt

# React frontend
cd client && npm run test:coverage
```

---

## Testing Patterns

### Unit Test — Service Method (xUnit + Moq)

```csharp
using Xunit;
using Moq;
using FluentAssertions;
using MassTransit;

public class BytesServiceTests
{
    private readonly Mock<IBytesRepository> _repoMock = new();
    private readonly Mock<IPublishEndpoint> _publisherMock = new();
    private readonly BytesService _sut;

    public BytesServiceTests()
    {
        _sut = new BytesService(_repoMock.Object, _publisherMock.Object);
    }

    [Fact]
    public async Task CreateByte_ValidRequest_ReturnsCreatedByte()
    {
        // Arrange
        var request = new CreateByteRequest { Body = "var x = 1;", Tags = ["csharp"] };
        var expected = new ByteDto { Id = Guid.NewGuid(), Body = request.Body };
        _repoMock.Setup(r => r.CreateAsync(request)).ReturnsAsync(expected);

        // Act
        var result = await _sut.CreateByteAsync(request, authorId: "user-123");

        // Assert
        result.Should().BeEquivalentTo(expected);
        _publisherMock.Verify(p => p.Publish(
            It.Is<ByteCreatedEvent>(e => e.ByteId == expected.Id),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateByte_EmptyBody_ThrowsValidationException()
    {
        // Arrange
        var request = new CreateByteRequest { Body = "", Tags = [] };

        // Act
        var act = () => _sut.CreateByteAsync(request, authorId: "user-123");

        // Assert
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Body*");
    }
}
```

### API Integration Test (WebApplicationFactory)

```csharp
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Json;

public class BytesApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public BytesApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Replace real DB with test DB
                    services.RemoveAll<IMongoDatabase>();
                    services.AddSingleton(CreateTestMongoDatabase());

                    // Replace MassTransit with in-memory for tests
                    services.AddMassTransitTestHarness();
                });
            })
            .CreateClient();
    }

    [Fact]
    public async Task POST_Bytes_ValidRequest_Returns201()
    {
        // Arrange
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateTestJwt());
        var body = new { Body = "public record Byte(string Content);", Tags = new[] { "csharp" } };

        // Act
        var response = await _client.PostAsJsonAsync("/api/bytes", body);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = await response.Content.ReadFromJsonAsync<ByteDto>();
        result!.Body.Should().Be(body.Body);
    }

    [Fact]
    public async Task POST_Bytes_NoAuth_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/bytes",
            new { Body = "test", Tags = Array.Empty<string>() });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task POST_Bytes_EmptyBody_Returns400()
    {
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateTestJwt());

        var response = await _client.PostAsJsonAsync("/api/bytes",
            new { Body = "", Tags = Array.Empty<string>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

### React Component Test (Jest + React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ByteCard } from './ByteCard'

describe('ByteCard Component', () => {
  it('renders byte content', () => {
    render(<ByteCard body="var x = 1;" author="devuser" tags={['javascript']} />)
    expect(screen.getByText('var x = 1;')).toBeInTheDocument()
  })

  it('calls onReact when reaction button clicked', () => {
    const handleReact = jest.fn()
    render(<ByteCard body="test" author="devuser" tags={[]} onReact={handleReact} />)

    fireEvent.click(screen.getByRole('button', { name: /react/i }))

    expect(handleReact).toHaveBeenCalledTimes(1)
  })

  it('shows tag badges for each tag', () => {
    render(<ByteCard body="test" author="devuser" tags={['react', 'typescript']} />)
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })
})
```

### E2E Test (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('user can create and view a Byte', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', 'test@byteai.dev')
  await page.click('[data-testid="send-magic-link"]')
  // (handle magic link auth in test fixture)

  // Navigate to create Byte
  await page.goto('/create')
  await page.fill('[data-testid="byte-body"]', 'const greet = (name: string) => `Hello, ${name}`')
  await page.click('[data-testid="tag-csharp"]')
  await page.click('[data-testid="publish-button"]')

  // Verify redirect to feed and byte appears
  await expect(page).toHaveURL('/feed')
  await expect(page.locator('[data-testid="byte-card"]').first())
    .toContainText('const greet')
})

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/create')
  await expect(page).toHaveURL(/\/login/)
})
```

---

## Test File Organization

```
ByteAI.sln
├── tests/
│   ├── ByteAI.UserService.Tests/
│   │   ├── Unit/
│   │   │   ├── UserServiceTests.cs
│   │   │   └── FollowServiceTests.cs
│   │   └── Integration/
│   │       └── UsersApiTests.cs          # WebApplicationFactory
│   ├── ByteAI.BytesService.Tests/
│   │   ├── Unit/
│   │   └── Integration/
│   └── ByteAI.Integration.Tests/         # Cross-service E2E API tests
│
└── client/
    └── src/
        ├── components/
        │   └── ByteCard/
        │       ├── ByteCard.tsx
        │       └── ByteCard.test.tsx
        └── e2e/
            ├── auth.spec.ts
            ├── feed.spec.ts
            └── create-byte.spec.ts
```

---

## Mocking External Services

### Mock RabbitMQ (MassTransit Test Harness)

```csharp
[Fact]
public async Task CreateByte_PublishesByteCreatedEvent()
{
    // Using MassTransit in-memory test harness
    var harness = Provider.GetRequiredService<ITestHarness>();
    await harness.Start();

    await _sut.CreateByteAsync(new CreateByteRequest { Body = "test" }, "user-1");

    // Assert event was published
    (await harness.Published.Any<ByteCreatedEvent>()).Should().BeTrue();

    var published = harness.Published.Select<ByteCreatedEvent>().Single();
    published.Context.Message.ByteId.Should().NotBeEmpty();
}
```

### Mock Redis

```csharp
// Use in-memory cache for unit tests
services.AddDistributedMemoryCache(); // replaces Redis in test DI
```

### Mock Groq API

```csharp
var groqMock = new Mock<IGroqClient>();
groqMock.Setup(g => g.GenerateTagsAsync(It.IsAny<string>()))
    .ReturnsAsync(new[] { "csharp", "dotnet" });
```

---

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Run .NET Tests
  run: dotnet test ByteAI.sln --collect:"XPlat Code Coverage" --no-build

- name: Run Frontend Tests
  working-directory: client
  run: npm test -- --coverage --watchAll=false

- name: Run E2E Tests
  run: npx playwright test
```

---

## Common Mistakes to Avoid

### WRONG: Testing internal implementation
```csharp
// Don't assert private fields or internal state
Assert.Equal(3, _service._retryCount); // BAD
```

### CORRECT: Test observable behavior
```csharp
// Assert what the system does, not how
var result = await _sut.GetByteAsync(id);
result.Should().NotBeNull();
result.Id.Should().Be(id);
```

### WRONG: Tests that depend on each other
```csharp
[Fact] public async Task Step1_CreateUser() { /* creates user */ }
[Fact] public async Task Step2_UpdateSameUser() { /* depends on Step1 */ } // BAD
```

### CORRECT: Independent tests with own setup
```csharp
[Fact]
public async Task UpdateUser_ValidData_ReturnsUpdated()
{
    var user = await _factory.CreateTestUserAsync(); // own setup
    // test logic
}
```

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.
