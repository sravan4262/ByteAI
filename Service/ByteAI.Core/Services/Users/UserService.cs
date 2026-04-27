using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Services.Users;

public sealed class UserService(AppDbContext db, ILogger<UserService> logger) : IUserService
{
    public Task<User?> GetByIdAsync(Guid userId, CancellationToken ct) =>
        db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.RoleType).FirstOrDefaultAsync(u => u.Id == userId, ct);

    public Task<User?> GetByUsernameAsync(string username, CancellationToken ct) =>
        db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.RoleType).FirstOrDefaultAsync(u => u.Username == username, ct);

    public async Task<PagedResult<User>> GetFollowersAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        // users.followers: user_id = userId → follower_id are the users who follow me
        var query = db.UserFollowers
            .Where(f => f.UserId == userId)
            .Include(f => f.Follower)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(f => f.Follower)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<User>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<User>> GetFollowingAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        // users.following: user_id = userId → following_id are the users I follow
        var query = db.UserFollowings
            .Where(f => f.UserId == userId)
            .Include(f => f.Following)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(f => f.Following)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<User>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<User> UpdateProfileAsync(Guid userId, string? displayName, string? bio, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException($"User {userId} not found");

        if (!string.IsNullOrWhiteSpace(displayName)) user.DisplayName = displayName;
        if (!string.IsNullOrWhiteSpace(bio)) user.Bio = bio;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<User> UpdateMyProfileAsync(
        Guid userId,
        string? username,
        string? displayName,
        string? bio,
        string? company,
        string? roleTitle,
        string? seniority,
        string? domain,
        List<string>? techStack,
        string? customAvatarUrl,
        CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException($"User {userId} not found");

        // Username — validate uniqueness before applying
        if (!string.IsNullOrWhiteSpace(username) && username != user.Username)
        {
            var taken = await db.Users.AnyAsync(u => u.Username == username && u.Id != userId, CancellationToken.None);
            if (taken) throw new InvalidOperationException($"Username '{username}' is already taken.");
            user.Username = username;
        }

        if (!string.IsNullOrWhiteSpace(displayName)) user.DisplayName = displayName;
        user.Bio = bio;
        user.Company = company;
        user.RoleTitle = roleTitle;
        if (!string.IsNullOrWhiteSpace(seniority)) user.Seniority = seniority;
        user.IsOnboarded = true;
        if (!string.IsNullOrWhiteSpace(domain)) user.Domain = domain;
        if (customAvatarUrl is not null) user.AvatarUrl = string.IsNullOrWhiteSpace(customAvatarUrl) ? null : customAvatarUrl;
        user.UpdatedAt = DateTime.UtcNow;

        if (techStack is not null)
        {
            // Replace tech stack: remove old, insert new matched by name
            var existing = db.UserTechStacks.Where(t => t.UserId == userId);
            db.UserTechStacks.RemoveRange(existing);

            if (techStack.Count > 0)
            {
                var matched = await db.TechStacks
                    .Where(t => techStack.Contains(t.Name))
                    .Select(t => t.Id)
                    .ToListAsync(CancellationToken.None);

                db.UserTechStacks.AddRange(matched.Select(tsId => new UserTechStack
                {
                    UserId = userId,
                    TechStackId = tsId,
                    CreatedAt = DateTime.UtcNow,
                }));
            }
        }

        await db.SaveChangesAsync(ct);

        // ── profile_complete XP (one-time, guarded by UserXpLog) ─────────────
        var hasBio       = !string.IsNullOrWhiteSpace(user.Bio);
        var hasTechStack = await db.UserTechStacks.AnyAsync(t => t.UserId == userId, CancellationToken.None);
        var hasSocial    = await db.Socials.AnyAsync(s => s.UserId == userId, CancellationToken.None);
        if (hasBio && hasTechStack && hasSocial)
            await XpAwarder.AwardAsync(db, userId, "profile_complete", logger, ct);

        return user;
    }

    public async Task<(User user, bool wasCreated)> ProvisionAsync(string supabaseUserId, string displayName, string? avatarUrl, string? email, CancellationToken ct)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.SupabaseUserId == supabaseUserId, ct);

        if (existing is not null)
        {
            // Idempotent — already provisioned. Award daily login XP on re-entry.
            await XpAwarder.AwardAsync(db, existing.Id, "daily_login", logger, ct);
            return (existing, false);
        }

        var username = await GenerateUniqueUsernameAsync(displayName, ct);
        var user = new User
        {
            SupabaseUserId = supabaseUserId,
            Email = email,
            Username = username,
            DisplayName = displayName,
            AvatarUrl = avatarUrl,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        // Assign default "user" role
        var userRoleType = await db.RoleTypes.FirstOrDefaultAsync(r => r.Name == "user", ct);
        if (userRoleType is not null)
        {
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleTypeId = userRoleType.Id });
            await db.SaveChangesAsync(ct);
        }

        // Auto-assign admin role for the owner email
        var adminEmail = "sravan4262@gmail.com";
        if (!string.IsNullOrEmpty(email) && email.Equals(adminEmail, StringComparison.OrdinalIgnoreCase))
        {
            var adminRoleType = await db.RoleTypes.FirstOrDefaultAsync(r => r.Name == "admin", ct);
            if (adminRoleType is not null && !await db.UserRoles.AnyAsync(ur => ur.UserId == user.Id && ur.RoleTypeId == adminRoleType.Id, ct))
            {
                db.UserRoles.Add(new UserRole { UserId = user.Id, RoleTypeId = adminRoleType.Id });
                await db.SaveChangesAsync(ct);
            }
        }

        return (user, true);
    }

    public async Task<User?> DeleteBySupabaseUserIdAsync(string supabaseUserId, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.SupabaseUserId == supabaseUserId, ct);
        if (user is null) return null;

        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    public Task<List<Social>> GetUserSocialsAsync(Guid userId, CancellationToken ct) =>
        db.Socials.Where(s => s.UserId == userId).ToListAsync(CancellationToken.None);

    public async Task UpsertUserSocialsAsync(Guid userId, List<(string Platform, string Url, string? Label)> socials, CancellationToken ct)
    {
        var existing = await db.Socials.Where(s => s.UserId == userId).ToListAsync(CancellationToken.None);
        db.Socials.RemoveRange(existing);

        db.Socials.AddRange(socials
            .Where(s => !string.IsNullOrWhiteSpace(s.Url))
            .Select(s => new Social
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Platform = s.Platform.ToLowerInvariant(),
                Url = s.Url.Trim(),
                Label = s.Label,
                CreatedAt = DateTime.UtcNow,
            }));

        await db.SaveChangesAsync(ct);

        // ── github_linked XP (one-time, guarded by UserXpLog) ────────────────
        var hasGithub = socials.Any(s => s.Platform.Equals("github", StringComparison.OrdinalIgnoreCase)
                                      && !string.IsNullOrWhiteSpace(s.Url));
        if (hasGithub)
            await XpAwarder.AwardAsync(db, userId, "github_linked", logger, ct);
    }

    public Task<bool> IsFollowingAsync(Guid followerId, Guid targetUserId, CancellationToken ct) =>
        db.UserFollowings.AnyAsync(f => f.UserId == followerId && f.FollowingId == targetUserId, ct);

    public async Task<(int BytesCount, int FollowersCount, int FollowingCount)> GetUserStatsAsync(Guid userId, CancellationToken ct)
    {
        var bytesCount = await db.Bytes.CountAsync(b => b.AuthorId == userId && b.IsActive, ct);
        var followersCount = await db.UserFollowers.CountAsync(f => f.UserId == userId, ct);
        var followingCount = await db.UserFollowings.CountAsync(f => f.UserId == userId, ct);
        return (bytesCount, followersCount, followingCount);
    }

    private async Task<string> GenerateUniqueUsernameAsync(string displayName, CancellationToken ct)
    {
        var base_ = string.IsNullOrEmpty(displayName)
            ? "user"
            : new string([.. displayName.ToLower().Where(c => char.IsLetterOrDigit(c) || c == '_')]);

        if (string.IsNullOrEmpty(base_)) base_ = "user";

        var candidate = base_[..Math.Min(base_.Length, 20)];
        var suffix = 0;

        while (await db.Users.AnyAsync(u => u.Username == candidate, ct))
        {
            suffix++;
            candidate = $"{base_[..Math.Min(base_.Length, 16)]}_{suffix}";
        }

        return candidate;
    }
}
