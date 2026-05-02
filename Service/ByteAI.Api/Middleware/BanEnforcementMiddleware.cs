using ByteAI.Api.Common.Auth;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Api.Middleware;

/// <summary>
/// Blocks requests from banned users. Runs after authentication so the user identity
/// is available. Banned users receive HTTP 403 with code ACCOUNT_SUSPENDED.
///
/// Lookup hits the DB on every authenticated request. Earlier this was cached for
/// 60 seconds in-process; that produced a 60-second window where bans hadn't yet
/// taken effect (and unbans hadn't yet been lifted), and the cache wasn't invalidated
/// on admin actions. The query is a single PK-style join (users → user_bans) and
/// is fast enough to skip the cache.
/// </summary>
public sealed class BanEnforcementMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, AppDbContext db)
    {
        var supabaseUserId = ctx.GetSupabaseUserId();
        if (supabaseUserId is not null)
        {
            var isBanned = await db.UserBans
                .AsNoTracking()
                .AnyAsync(b => b.User!.SupabaseUserId == supabaseUserId
                            && (b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow),
                          ctx.RequestAborted);

            if (isBanned)
            {
                ctx.Response.StatusCode  = StatusCodes.Status403Forbidden;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsJsonAsync(new
                {
                    code    = "ACCOUNT_SUSPENDED",
                    message = "Your account has been suspended. Please contact officialbyteai@gmail.com to appeal.",
                });
                return;
            }
        }

        await next(ctx);
    }
}
