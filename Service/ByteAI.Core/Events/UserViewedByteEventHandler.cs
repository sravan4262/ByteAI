using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pgvector;

namespace ByteAI.Core.Events;

/// <summary>
/// Updates User.InterestEmbedding via EMA when a user reads a byte (dwell >= 5s).
/// Lower beta than likes/bookmarks — views are weaker signal.
///   new = L2Normalize(0.97 * current + 0.03 * byte_embedding)
/// </summary>
public sealed class UserViewedByteEventHandler(
    IServiceScopeFactory scopeFactory,
    ILogger<UserViewedByteEventHandler> logger)
    : INotificationHandler<UserViewedByteEvent>
{
    private const float Alpha = 0.97f;
    private const float Beta  = 0.03f;

    public async Task Handle(UserViewedByteEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var byteEmbedding = await db.Bytes
                .AsNoTracking()
                .Where(b => b.Id == notification.ByteId && b.Embedding != null)
                .Select(b => b.Embedding)
                .FirstOrDefaultAsync(CancellationToken.None);

            if (byteEmbedding is null) return;

            var user = await db.Users.FindAsync([notification.UserId], CancellationToken.None);
            if (user is null) return;

            var contentVec = byteEmbedding.ToArray();

            float[] updated;
            if (user.InterestEmbedding is null)
            {
                updated = contentVec;
            }
            else
            {
                var current = user.InterestEmbedding.ToArray();
                updated = new float[current.Length];
                for (int i = 0; i < current.Length; i++)
                    updated[i] = Alpha * current[i] + Beta * contentVec[i];
            }

            user.InterestEmbedding = new Vector(NormalizeL2(updated));
            await db.SaveChangesAsync(CancellationToken.None);

            logger.LogDebug("Updated interest embedding for user {UserId} after viewing byte {ByteId}",
                notification.UserId, notification.ByteId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to update interest embedding for user {UserId} on view", notification.UserId);
        }
    }

    private static float[] NormalizeL2(float[] v)
    {
        float norm = (float)Math.Sqrt(v.Sum(x => x * x));
        if (norm > 1e-9f)
            for (int i = 0; i < v.Length; i++)
                v[i] /= norm;
        return v;
    }
}
