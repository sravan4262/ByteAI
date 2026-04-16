using ByteAI.Core.Entities;
using ByteAI.Core.Exceptions;
using ByteAI.Core.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace ByteAI.Api.Middleware;

/// <summary>
/// Catches all unhandled exceptions, maps them to RFC 7807 ProblemDetails,
/// and writes a row to users.logs for error-level events.
/// Must be registered first in the middleware pipeline.
/// </summary>
public sealed class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            await HandleAsync(ctx, ex);
        }
    }

    private async Task HandleAsync(HttpContext ctx, Exception ex)
    {
        var (status, title, detail) = ex switch
        {
            KeyNotFoundException           => (404, "Not Found",             ex.Message),
            UnauthorizedAccessException    => (403, "Forbidden",             "You are not authorized to perform this action."),
            InvalidContentException ice    => (422, "Invalid Content",       ice.Reason),
            DuplicateContentException      => (409, "Duplicate Content",     ex.Message),
            ValidationException ve         => (400, "Validation Failed",     BuildValidationDetail(ve)),
            OperationCanceledException     => (499, "Request Cancelled",     "The request was cancelled."),
            _                              => (500, "Internal Server Error", "An unexpected error occurred. Please try again later.")
        };

        // Log to structured logger (Serilog) — captures in console + any sinks
        if (status >= 500)
            logger.LogError(ex, "Unhandled exception: {Title} | Path: {Path}", title, ctx.Request.Path);
        else
            logger.LogWarning(ex, "Handled exception: {Status} {Title} | Path: {Path}", status, title, ctx.Request.Path);

        // Persist to users.logs table for audit/support queries
        await PersistLogAsync(ctx, ex, status, title);

        var problem = new ProblemDetails
        {
            Status = status,
            Title  = title,
            Detail = detail,
            Instance = ctx.Request.Path,
        };

        ctx.Response.StatusCode  = status;
        ctx.Response.ContentType = "application/problem+json";

        await ctx.Response.WriteAsJsonAsync(problem);
    }

    private async Task PersistLogAsync(HttpContext ctx, Exception ex, int status, string title)
    {
        // Use a fresh scope so a failed DbContext doesn't prevent logging
        try
        {
            await using var scope = ctx.RequestServices.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var userId = ResolveUserId(ctx);

            db.AppLogs.Add(new AppLog
            {
                Level        = status >= 500 ? "error" : "warn",
                Message      = $"{title}: {ex.Message}",
                Exception    = ex.ToString(),
                Source       = ex.Source,
                UserId       = userId,
                RequestPath  = ctx.Request.Path.Value,
                Properties   = JsonSerializer.Serialize(new
                {
                    StatusCode = status,
                    Method     = ctx.Request.Method,
                    ExType     = ex.GetType().Name,
                }),
                CreatedAt    = DateTime.UtcNow,
            });

            await db.SaveChangesAsync();
        }
        catch (Exception logEx)
        {
            // Never let logging failure obscure the original error
            logger.LogError(logEx, "Failed to persist error log to database");
        }
    }

    private static Guid? ResolveUserId(HttpContext ctx)
    {
        // Try to extract internal DB user id stored as a custom claim by ClerkJwt middleware
        var sub = ctx.User.FindFirstValue("byteai_user_id");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private static string BuildValidationDetail(ValidationException ve) =>
        string.Join("; ", ve.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}"));
}
