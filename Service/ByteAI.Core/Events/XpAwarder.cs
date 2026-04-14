using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

/// <summary>
/// Reads XP amount from lookups.xp_action_types by action name,
/// guards one-time and daily awards via users.user_xp_log,
/// adds XP to the user, and logs the award. Never throws.
/// </summary>
public static class XpAwarder
{
    public static async Task AwardAsync(
        AppDbContext db,
        Guid userId,
        string actionName,
        ILogger logger,
        CancellationToken ct = default)
    {
        try
        {
            var action = await db.XpActionTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Name == actionName && a.IsActive, ct);

            if (action is null)
            {
                logger.LogWarning("XP action '{Action}' not found or inactive — skipping for user {UserId}", actionName, userId);
                return;
            }

            // ── One-time guard ────────────────────────────────────────────────
            if (action.IsOneTime)
            {
                var alreadyAwarded = await db.UserXpLogs
                    .AnyAsync(l => l.UserId == userId && l.ActionName == actionName, ct);
                if (alreadyAwarded) return;
            }

            // ── Daily guard (daily_login is capped to once per calendar day) ──
            if (actionName == "daily_login")
            {
                var today = DateTime.UtcNow.Date;
                var awardedToday = await db.UserXpLogs
                    .AnyAsync(l => l.UserId == userId && l.ActionName == actionName && l.AwardedAt >= today, ct);
                if (awardedToday) return;
            }

            // ── Award XP ──────────────────────────────────────────────────────
            var user = await db.Users.FindAsync([userId], ct);
            if (user is null) return;

            user.Xp += action.XpAmount;

            db.UserXpLogs.Add(new UserXpLog
            {
                UserId     = userId,
                ActionName = actionName,
                XpAmount   = action.XpAmount,
                AwardedAt  = DateTime.UtcNow,
            });

            await db.SaveChangesAsync(ct);

            logger.LogDebug("Awarded {Xp} XP (action={Action}) to user {UserId}", action.XpAmount, actionName, userId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to award XP (action={Action}) to user {UserId}", actionName, userId);
        }
    }
}
