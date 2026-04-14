using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Api.Common.Auth;

/// <summary>
/// Custom authorization attribute that verifies the Clerk user exists in the local database
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
            var clerkId = context.HttpContext.GetClerkUserId();
            if (string.IsNullOrEmpty(clerkId))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var hasRole = await db.Users
                .AsNoTracking()
                .Where(u => u.ClerkId == clerkId)
                .SelectMany(u => u.UserRoles)
                .AnyAsync(ur => ur.RoleType.Name.ToLower() == role.ToLower(), context.HttpContext.RequestAborted);

            if (!hasRole)
            {
                context.Result = new ForbidResult();
            }
        }
    }
}
