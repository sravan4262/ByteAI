using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Preferences;

public sealed class UserPreferencesService(AppDbContext db) : IUserPreferencesService
{
    public async Task<UserPreferences> GetOrDefaultAsync(Guid userId, CancellationToken ct)
    {
        var prefs = await db.UserPreferences.FindAsync([userId], ct);
        return prefs ?? new UserPreferences { UserId = userId };
    }

    public async Task<UserPreferences> UpsertAsync(
        Guid userId,
        string? theme,
        string? visibility,
        bool? notifReactions,
        bool? notifComments,
        bool? notifFollowers,
        bool? notifUnfollows,
        CancellationToken ct)
    {
        var prefs = await db.UserPreferences.FindAsync([userId], ct);

        if (prefs is null)
        {
            prefs = new UserPreferences { UserId = userId };
            db.UserPreferences.Add(prefs);
        }

        if (theme is not null) prefs.Theme = theme;
        if (visibility is not null) prefs.Visibility = visibility;
        if (notifReactions is not null) prefs.NotifReactions = notifReactions.Value;
        if (notifComments is not null) prefs.NotifComments = notifComments.Value;
        if (notifFollowers is not null) prefs.NotifFollowers = notifFollowers.Value;
        if (notifUnfollows is not null) prefs.NotifUnfollows = notifUnfollows.Value;
        prefs.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return prefs;
    }
}
