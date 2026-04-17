using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Api.Common.Auth;

/// <summary>
/// Custom authorization attribute that verifies the authenticated user has access to a specific feature flag.
/// Also checks Groq availability — returns 503 if both models are RPD-exhausted today.
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
        AppDbContext db,
        GroqLoadBalancer balancer) : IAsyncAuthorizationFilter
    {
        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            // Check Groq availability before anything else.
            // Both models RPD-exhausted → 503 with clear message until UTC midnight.
            if (!balancer.IsAvailable)
            {
                context.Result = new ObjectResult(new
                {
                    error   = "AI_QUOTA_EXHAUSTED",
                    message = "AI features are unavailable — daily quota exhausted. Resets at UTC midnight."
                })
                { StatusCode = StatusCodes.Status503ServiceUnavailable };
                return;
            }

            var supabaseUserId = context.HttpContext.GetSupabaseUserId();
            if (string.IsNullOrEmpty(supabaseUserId))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            // Get the feature flag type
            var flagType = await db.FeatureFlagTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.Key == featureFlagKey, context.HttpContext.RequestAborted);

            if (flagType is null)
            {
                context.Result = new ForbidResult();
                return;
            }

            // Global open — everyone has access
            if (flagType.GlobalOpen)
                return;

            // Check per-user assignment
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
