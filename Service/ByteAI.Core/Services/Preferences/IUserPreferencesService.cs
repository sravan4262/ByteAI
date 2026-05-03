using ByteAI.Core.Entities;

namespace ByteAI.Core.Services.Preferences;

public interface IUserPreferencesService
{
    Task<UserPreferences> GetOrDefaultAsync(Guid userId, CancellationToken ct);
    Task<UserPreferences> UpsertAsync(
        Guid userId,
        string? theme,
        string? visibility,
        bool? notifReactions,
        bool? notifComments,
        bool? notifFollowers,
        bool? notifUnfollows,
        bool? notifMentions,
        CancellationToken ct);
}
