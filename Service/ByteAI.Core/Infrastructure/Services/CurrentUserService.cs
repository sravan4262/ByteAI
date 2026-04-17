using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Infrastructure.Services;

public sealed class CurrentUserService(AppDbContext db) : ICurrentUserService
{
    public async Task<User?> GetCurrentUserAsync(string supabaseUserId, CancellationToken ct = default) =>
        await db.Users.AsNoTracking()
            .Include(u => u.UserBadges)
                .ThenInclude(ub => ub.BadgeTypeNav)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.RoleType)
            .Include(u => u.UserTechStacks)
                .ThenInclude(uts => uts.TechStack)
            .FirstOrDefaultAsync(u => u.SupabaseUserId == supabaseUserId, CancellationToken.None);

    public async Task<Guid?> GetCurrentUserIdAsync(string supabaseUserId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking()
            .Where(u => u.SupabaseUserId == supabaseUserId)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(CancellationToken.None);
        return user;
    }
}
