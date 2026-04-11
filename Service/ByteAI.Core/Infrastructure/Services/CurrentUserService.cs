using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Infrastructure.Services;

public sealed class CurrentUserService(AppDbContext db) : ICurrentUserService
{
    public async Task<User?> GetCurrentUserAsync(string clerkId, CancellationToken ct = default) =>
        await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.ClerkId == clerkId, ct);

    public async Task<Guid?> GetCurrentUserIdAsync(string clerkId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking()
            .Where(u => u.ClerkId == clerkId)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        return user;
    }
}
