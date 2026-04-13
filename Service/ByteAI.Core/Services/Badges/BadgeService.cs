using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Services.Badges;

public sealed class BadgeService(AppDbContext db, ILogger<BadgeService> logger) : IBadgeService
{
    public async Task<List<BadgeType>> CheckAndAwardAsync(Guid userId, BadgeTrigger trigger, CancellationToken ct)
    {
        var allBadges = await db.BadgeTypes.AsNoTracking().ToListAsync(CancellationToken.None);
        var earnedIds = await db.UserBadges
            .Where(ub => ub.UserId == userId && ub.BadgeTypeId.HasValue)
            .Select(ub => ub.BadgeTypeId!.Value)
            .ToListAsync(CancellationToken.None);

        // Compute streak once — needed for streak-based badge checks
        int? streak = null;
        if (trigger == BadgeTrigger.BytePosted)
            streak = await ComputeAndUpdateStreakAsync(userId, ct);

        var newlyEarned = new List<BadgeType>();

        foreach (var badge in allBadges)
        {
            if (earnedIds.Contains(badge.Id)) continue;

            bool qualifies = await CheckConditionAsync(userId, badge.Name, trigger, streak, ct);
            if (!qualifies) continue;

            db.UserBadges.Add(new UserBadge
            {
                UserId = userId,
                BadgeTypeId = badge.Id,
                BadgeType = badge.Name,   // required text column in DB
                EarnedAt = DateTime.UtcNow,
            });
            newlyEarned.Add(badge);
            logger.LogInformation("User {UserId} earned badge '{Badge}'", userId, badge.Name);
        }

        if (newlyEarned.Count > 0)
            await db.SaveChangesAsync(ct);

        return newlyEarned;
    }

    // ── Streak computation ────────────────────────────────────────────────────

    private async Task<int> ComputeAndUpdateStreakAsync(Guid userId, CancellationToken ct)
    {
        // Get the two most recent byte dates (the current one was already saved)
        var recentDates = await db.Bytes
            .Where(b => b.AuthorId == userId && b.IsActive)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => b.CreatedAt)
            .Take(2)
            .ToListAsync(CancellationToken.None);

        var user = await db.Users.FindAsync([userId], CancellationToken.None);
        if (user is null) return 0;

        var today = DateTime.UtcNow.Date;

        int newStreak;
        if (recentDates.Count <= 1)
        {
            newStreak = 1;
        }
        else
        {
            var prevDate = recentDates[1].Date; // Second most-recent byte

            if (prevDate == today.AddDays(-1))
                newStreak = user.Streak + 1;   // Consecutive day
            else if (prevDate == today)
                newStreak = user.Streak;        // Same day, no change
            else
                newStreak = 1;                  // Streak broken
        }

        user.Streak = newStreak;
        await db.SaveChangesAsync(ct);
        return newStreak;
    }

    // ── Per-badge condition checks ────────────────────────────────────────────

    private async Task<bool> CheckConditionAsync(
        Guid userId, string badgeName, BadgeTrigger trigger, int? streak, CancellationToken ct) =>
        badgeName switch
        {
            // ── BytePosted triggers ──────────────────────────────────────────
            "first_byte" when trigger == BadgeTrigger.BytePosted =>
                await db.Bytes.CountAsync(b => b.AuthorId == userId && b.IsActive, ct) == 1,

            "byte_streak_7" when trigger == BadgeTrigger.BytePosted =>
                streak >= 7,

            "byte_streak_30" when trigger == BadgeTrigger.BytePosted =>
                streak >= 30,

            // ── ReactionReceived trigger ─────────────────────────────────────
            "reactions_100" when trigger == BadgeTrigger.ReactionReceived =>
                await db.UserLikes
                    .Where(l => db.Bytes
                        .Where(b => b.AuthorId == userId)
                        .Select(b => b.Id)
                        .Contains(l.ByteId))
                    .CountAsync(CancellationToken.None) >= 100,

            // ── FollowReceived trigger ───────────────────────────────────────
            "followers_100" when trigger == BadgeTrigger.FollowReceived =>
                await db.UserFollowers.CountAsync(f => f.UserId == userId, ct) >= 100,

            "followers_1k" when trigger == BadgeTrigger.FollowReceived =>
                await db.UserFollowers.CountAsync(f => f.UserId == userId, ct) >= 1000,

            // ── CommentPosted trigger ────────────────────────────────────────
            "mentor" when trigger == BadgeTrigger.CommentPosted =>
                await db.Comments.CountAsync(c => c.AuthorId == userId, ct) >= 50,

            // ── UserRegistered trigger ───────────────────────────────────────
            "early_adopter" when trigger == BadgeTrigger.UserRegistered =>
                true, // Awarded to every user who registers during the early-access phase

            // Unrecognised badge name or wrong trigger — skip
            _ => false,
        };
}
