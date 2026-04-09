---
name: security-review
description: Security checklist and patterns for ByteAI — ASP.NET Core 8 backend (auth, input validation, rate limiting, secrets) and React PWA frontend (XSS, CSP, CSRF). Covers OWASP Top 10.
origin: ECC (adapted for ByteAI)
---

# Security Review Skill

This skill ensures all code follows security best practices and identifies potential vulnerabilities.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Storing or transmitting sensitive data
- Integrating third-party APIs

---

## Security Checklist

### 1. Secrets Management

#### NEVER Do This
```csharp
// BAD: hardcoded secrets in source code
private const string ApiKey = "groq-sk-xxxxx";
private const string DbPassword = "password123";
```

#### ALWAYS Do This
```csharp
// GOOD: read from environment / configuration
var groqApiKey = builder.Configuration["Groq:ApiKey"]
    ?? throw new InvalidOperationException("Groq:ApiKey not configured");

var connString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("Postgres connection string not configured");
```

#### Verification Steps
- [ ] No hardcoded API keys, tokens, or passwords in source
- [ ] All secrets injected via `appsettings.json` + env vars (never committed)
- [ ] `appsettings.Development.json` in `.gitignore`
- [ ] Production secrets stored in Azure Key Vault / GitHub Actions secrets
- [ ] No secrets in git history (`git log -p | grep -i "password\|api_key\|secret"`)

---

### 2. Input Validation (FluentValidation)

#### Always Validate User Input
```csharp
using FluentValidation;

public class CreateByteRequestValidator : AbstractValidator<CreateByteRequest>
{
    public CreateByteRequestValidator()
    {
        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("Body is required")
            .MaximumLength(280).WithMessage("Byte must be 280 characters or fewer");

        RuleFor(x => x.Tags)
            .NotNull()
            .Must(tags => tags.Length <= 5).WithMessage("Maximum 5 tags allowed")
            .ForEach(tag => tag
                .NotEmpty()
                .MaximumLength(30)
                .Matches("^[a-z0-9-]+$").WithMessage("Tags must be lowercase alphanumeric"));
    }
}

// Registration
builder.Services.AddValidatorsFromAssemblyContaining<CreateByteRequestValidator>();

// Usage in endpoint
app.MapPost("/api/bytes", async (
    CreateByteRequest request,
    IValidator<CreateByteRequest> validator) =>
{
    var result = await validator.ValidateAsync(request);
    if (!result.IsValid)
        return Results.ValidationProblem(result.ToDictionary());

    // proceed with validated input
});
```

#### File Upload Validation
```csharp
public static class FileValidator
{
    private static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    private const long MaxSizeBytes = 5 * 1024 * 1024; // 5MB

    public static void Validate(IFormFile file)
    {
        if (file.Length > MaxSizeBytes)
            throw new ValidationException("File too large (max 5MB)");

        if (!AllowedTypes.Contains(file.ContentType.ToLowerInvariant()))
            throw new ValidationException("Invalid file type");

        // Check actual file signature (not just extension)
        var header = new byte[4];
        file.OpenReadStream().Read(header, 0, 4);

        if (!IsValidImageSignature(header))
            throw new ValidationException("File content does not match declared type");
    }

    private static bool IsValidImageSignature(byte[] header) =>
        // JPEG: FF D8 FF
        (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) ||
        // PNG: 89 50 4E 47
        (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) ||
        // GIF: 47 49 46
        (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46);
}
```

#### Verification Steps
- [ ] All user inputs validated with FluentValidation
- [ ] File uploads restricted (size, type, content signature)
- [ ] No direct use of user input in raw SQL
- [ ] Whitelist validation (not blacklist)
- [ ] Error messages do not leak sensitive info

---

### 3. SQL Injection Prevention

#### NEVER Concatenate SQL
```csharp
// BAD: SQL injection vulnerability
var sql = $"SELECT * FROM users WHERE username = '{username}'";
await conn.QueryAsync(sql); // DANGEROUS
```

#### ALWAYS Use Parameterized Queries
```csharp
// GOOD: Dapper parameterized query
var user = await conn.QueryFirstOrDefaultAsync<User>(
    "SELECT * FROM users WHERE username = @Username",
    new { Username = username });

// GOOD: EF Core — always parameterized
var user = await _db.Users
    .Where(u => u.Username == username)
    .FirstOrDefaultAsync();

// GOOD: EF Core raw SQL — use FromSqlInterpolated (parameterized)
var users = await _db.Users
    .FromSqlInterpolated($"SELECT * FROM users WHERE domain = {domain}")
    .ToListAsync();

// BAD: FromSqlRaw with string interpolation
var users = await _db.Users
    .FromSqlRaw($"SELECT * FROM users WHERE domain = '{domain}'") // DANGEROUS
    .ToListAsync();
```

#### Verification Steps
- [ ] All Dapper queries use `@Parameter` syntax
- [ ] All EF Core raw SQL uses `FromSqlInterpolated`, never string concatenation
- [ ] No dynamic `ORDER BY` column names from user input

---

### 4. Authentication & Authorization (Clerk + ASP.NET Core)

#### JWT Token Handling
```csharp
// GOOD: JWT validated in YARP gateway before reaching microservices
// Microservices trust the forwarded user context headers from gateway

// GOOD: extract user ID from validated JWT claims
public static class ClaimsPrincipalExtensions
{
    public static string GetUserId(this ClaimsPrincipal user) =>
        user.FindFirst("sub")?.Value
            ?? throw new UnauthorizedException("User ID claim missing");
}

// GOOD: Use in endpoint
app.MapDelete("/api/bytes/{id}", async (Guid id, ClaimsPrincipal user, IBytesService svc) =>
{
    await svc.DeleteByteAsync(id, user.GetUserId());
    return Results.NoContent();
}).RequireAuthorization();
```

#### Authorization Checks
```csharp
public async Task DeleteByteAsync(Guid byteId, string requesterId)
{
    var byteDto = await _repo.GetByIdAsync(byteId)
        ?? throw new NotFoundException("Byte", byteId);

    // ALWAYS verify ownership before mutation
    if (byteDto.AuthorId != requesterId)
        throw new ForbiddenException("You can only delete your own Bytes");

    await _repo.DeleteAsync(byteId);
}
```

#### Row Level Security (PostgreSQL)
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own profile
CREATE POLICY "users_self_select" ON users FOR SELECT
    USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "users_self_update" ON users FOR UPDATE
    USING (id = current_setting('app.current_user_id')::uuid);
```

#### Verification Steps
- [ ] All endpoints have `.RequireAuthorization()`
- [ ] Authorization checks happen before mutations, not after fetching
- [ ] Admin operations have policy-based authorization
- [ ] RLS enabled on tables with user-owned data

---

### 5. XSS Prevention (React Frontend)

#### Sanitize User-Provided HTML
```typescript
import DOMPurify from 'isomorphic-dompurify'

// ALWAYS sanitize before rendering user-provided HTML
function renderByteBody(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['code', 'pre', 'b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: ['class']
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}

// React protects against XSS by default when using JSX (no dangerouslySetInnerHTML)
// Only use dangerouslySetInnerHTML when you MUST render HTML — and always sanitize first
```

#### Content Security Policy (ASP.NET Core + Next.js)
```csharp
// ASP.NET Core — add CSP header in YARP or each service
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.byteai.dev;");
    await next();
});
```

#### Verification Steps
- [ ] User-provided content sanitized with DOMPurify before rendering
- [ ] CSP headers configured in gateway
- [ ] No `eval()` or `Function()` with user input
- [ ] React's built-in escaping used wherever possible

---

### 6. CSRF Protection

ASP.NET Core's cookie-based endpoints use built-in AntiForgery. For JWT-only APIs (stateless), CSRF is not applicable — JWTs are not automatically sent by browsers.

```csharp
// For any form/cookie endpoints, use antiforgery
builder.Services.AddAntiforgery();

app.MapPost("/api/upload", async (IFormFile file, IAntiforgery antiforgery, HttpContext ctx) =>
{
    await antiforgery.ValidateRequestAsync(ctx);
    // process upload
}).DisableAntiforgery(); // or keep enabled for form endpoints
```

#### Verification Steps
- [ ] JWT APIs are stateless — CSRF not applicable
- [ ] Any session/cookie endpoints have antiforgery validation
- [ ] SameSite=Strict on any cookies set by the API

---

### 7. Rate Limiting (ASP.NET Core 8 built-in)

```csharp
// Program.cs
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api-global", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 100;
        limiter.QueueLimit = 0;
    });

    // Aggressive limit for AI endpoints (expensive)
    options.AddFixedWindowLimiter("ai-endpoints", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 10;
        limiter.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

app.UseRateLimiter();
app.MapPost("/api/bytes/ai-suggest", AiSuggestHandler).RequireRateLimiting("ai-endpoints");
```

#### Verification Steps
- [ ] Rate limiting enabled on all public endpoints
- [ ] Stricter limits on AI/search/expensive endpoints
- [ ] 429 responses include `Retry-After` header

---

### 8. Sensitive Data Exposure

#### Logging
```csharp
// BAD: logging sensitive data
_logger.LogInformation("User login: email={Email} password={Password}", email, password);

// GOOD: log only safe identifiers
_logger.LogInformation("User login: userId={UserId}", userId);
_logger.LogInformation("Payment processed: last4={Last4} userId={UserId}", last4, userId);
```

#### Error Responses
```csharp
// BAD: exposing stack traces to clients
catch (Exception ex)
{
    return Results.Problem(ex.Message, statusCode: 500, detail: ex.StackTrace); // NEVER
}

// GOOD: generic message to client, full detail in server logs
catch (Exception ex)
{
    _logger.LogError(ex, "Unhandled error processing request {RequestId}", requestId);
    return Results.Problem("An unexpected error occurred.", statusCode: 500);
}
```

#### Verification Steps
- [ ] No passwords, tokens, or secrets in log output
- [ ] Error responses return generic messages (stack traces only in server logs)
- [ ] OpenTelemetry traces do not include PII
- [ ] Database connection strings not logged

---

### 9. Dependency Security

```bash
# Check NuGet packages for known vulnerabilities
dotnet list package --vulnerable --include-transitive

# Update vulnerable packages
dotnet add package <PackageName> --version <SafeVersion>

# Check npm packages (React PWA)
cd client && npm audit

# Fix automatically fixable issues
cd client && npm audit fix
```

#### Verification Steps
- [ ] `dotnet list package --vulnerable` returns no HIGH/CRITICAL issues
- [ ] `npm audit` clean for React client
- [ ] Dependabot enabled on GitHub repository
- [ ] NuGet lock file (`packages.lock.json`) committed for reproducible builds

---

## Pre-Deployment Security Checklist

Before ANY production deployment:

- [ ] **Secrets**: No hardcoded secrets — all in Azure Key Vault / environment
- [ ] **Input Validation**: All endpoints have FluentValidation validators
- [ ] **SQL Injection**: All queries parameterized (Dapper `@Param` or EF Core)
- [ ] **XSS**: User-provided HTML sanitized with DOMPurify
- [ ] **Authentication**: `.RequireAuthorization()` on all non-public endpoints
- [ ] **Authorization**: Ownership checked before mutations
- [ ] **Rate Limiting**: Enabled for all services in YARP gateway
- [ ] **HTTPS**: Enforced — `UseHttpsRedirection()` in all services
- [ ] **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
- [ ] **Error Handling**: No stack traces or internal detail in API responses
- [ ] **Logging**: No PII or secrets in log statements
- [ ] **Dependencies**: No HIGH/CRITICAL NuGet or npm vulnerabilities
- [ ] **RLS**: Row Level Security enabled on user-owned PostgreSQL tables
- [ ] **CORS**: Configured to allow only known origins
- [ ] **File Uploads**: Size + type + content-signature validation

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ASP.NET Core Security Docs](https://learn.microsoft.com/en-us/aspnet/core/security/)
- [Clerk Security](https://clerk.com/docs/security)
- [Web Security Academy](https://portswigger.net/web-security)

---

**Remember**: Security is not optional. One vulnerability can compromise the entire platform and all user data. When in doubt, err on the side of caution.
