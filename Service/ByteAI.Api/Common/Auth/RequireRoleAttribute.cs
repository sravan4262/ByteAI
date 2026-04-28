using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Api.Common.Auth;

/// <summary>
/// Custom authorization attribute that verifies the authenticated user exists in the local database
/// and has the specified role (e.g., "admin"). Returns 403 Forbidden if not.
/// </summary>
public sealed class RequireRoleAttribute : TypeFilterAttribute
{
    public RequireRoleAttribute(string role) : base(typeof(RequireRoleFilter))
    {
        Arguments = new object[] { role };
    }

    private sealed class RequireRoleFilter(string role, AppDbContext db) : IAsyncAuthorizationFilter
    {
        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var supabaseUserId = context.HttpContext.GetSupabaseUserId();
            if (string.IsNullOrEmpty(supabaseUserId))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            try
            {
                var hasRole = await db.Users
                    .AsNoTracking()
                    .Where(u => u.SupabaseUserId == supabaseUserId)
                    .SelectMany(u => u.UserRoles)
                    .AnyAsync(ur => ur.RoleType.Name.ToLower() == role.ToLower(), context.HttpContext.RequestAborted);

                if (!hasRole)
                {
                    context.Result = new ForbidResult();
                }
            }
            catch (OperationCanceledException)
            {
                // Client disconnected before the DB query completed — treat as a no-op.
                // GlobalExceptionMiddleware returns 499 for cancelled requests; we just
                // need to avoid propagating an unhandled exception that logs as 500.
                context.Result = new StatusCodeResult(499);
            }
        }
    }
}
