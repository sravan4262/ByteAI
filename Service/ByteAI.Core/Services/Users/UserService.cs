using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Users;

public sealed class UserService(AppDbContext db) : IUserService
{
    public Task<User?> GetByIdAsync(Guid userId, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);

    public Task<User?> GetByUsernameAsync(string username, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);

    public async Task<PagedResult<User>> GetFollowersAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Follows
            .Where(f => f.FollowingId == userId)
            .Include(f => f.Follower)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(f => f.Follower)
            .ToListAsync(ct);

        return new PagedResult<User>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<User>> GetFollowingAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Follows
            .Where(f => f.FollowerId == userId)
            .Include(f => f.Following)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(f => f.Following)
            .ToListAsync(ct);

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
        string? displayName,
        string? bio,
        string? company,
        string? roleTitle,
        string? seniority,
        string? domain,
        List<string>? techStack,
        CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException($"User {userId} not found");

        if (!string.IsNullOrWhiteSpace(displayName)) user.DisplayName = displayName;
        user.Bio = bio;
        user.Company = company;
        user.RoleTitle = roleTitle;
        if (!string.IsNullOrWhiteSpace(seniority)) user.Seniority = seniority;
        if (!string.IsNullOrWhiteSpace(domain)) user.Domain = domain;
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
                    .ToListAsync(ct);

                db.UserTechStacks.AddRange(matched.Select(tsId => new UserTechStack
                {
                    UserId = userId,
                    TechStackId = tsId,
                    CreatedAt = DateTime.UtcNow,
                }));
            }
        }

        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<(User user, bool wasCreated)> UpsertByClerkAsync(string clerkId, string displayName, string? avatarUrl, CancellationToken ct)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.ClerkId == clerkId, ct);

        if (existing is null)
        {
            var username = await GenerateUniqueUsernameAsync(displayName, ct);
            var user = new User
            {
                ClerkId = clerkId,
                Username = username,
                DisplayName = displayName,
                AvatarUrl = avatarUrl,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync(ct);
            return (user, true);
        }

        existing.DisplayName = displayName;
        if (avatarUrl is not null) existing.AvatarUrl = avatarUrl;
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return (existing, false);
    }

    public async Task<bool> DeleteByClerkIdAsync(string clerkId, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.ClerkId == clerkId, ct);
        if (user is null) return false;

        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public Task<List<Social>> GetUserSocialsAsync(Guid userId, CancellationToken ct) =>
        db.Socials.Where(s => s.UserId == userId).ToListAsync(ct);

    public async Task UpsertUserSocialsAsync(Guid userId, List<(string Platform, string Url, string? Label)> socials, CancellationToken ct)
    {
        var existing = await db.Socials.Where(s => s.UserId == userId).ToListAsync(ct);
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
