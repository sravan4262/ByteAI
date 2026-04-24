using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Api.Common.Auth;

/// <summary>
/// Custom authorization attribute that verifies the authenticated user has access to a specific feature flag.
/// Returns 403 Forbidden if user doesn't have the feature flag enabled.
/// </summary>
public sealed class RequireFeatureFlagAttribute : TypeFilterAttribute
{
    public RequireFeatureFlagAttribute(string featureFlagKey) : base(typeof(RequireFeatureFlagFilter))
    {
        Arguments = new object[] { featureFlagKey };
    }

    private sealed class RequireFeatureFlagFilter(
        string featureFlagKey,
        AppDbContext db) : IAsyncAuthorizationFilter
    {
        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var supabaseUserId = context.HttpContext.GetSupabaseUserId();
            if (string.IsNullOrEmpty(supabaseUserId))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var flagType = await db.FeatureFlagTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.Key == featureFlagKey, context.HttpContext.RequestAborted);

            if (flagType is null)
            {
                context.Result = new ForbidResult();
                return;
            }

            if (flagType.GlobalOpen)
                return;

            var hasAccess = await db.Users
                .AsNoTracking()
                .Where(u => u.SupabaseUserId == supabaseUserId)
                .SelectMany(u => u.UserFeatureFlags)
                .AnyAsync(uff => uff.FeatureFlagTypeId == flagType.Id, context.HttpContext.RequestAborted);

            if (!hasAccess)
                context.Result = new ForbidResult();
        }
    }
}
