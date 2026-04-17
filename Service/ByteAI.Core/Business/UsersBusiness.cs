using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Users;

namespace ByteAI.Core.Business;

public sealed class UsersBusiness(
    IUserService userService,
    ICurrentUserService currentUserService,
    IBadgeService badgeService) : IUsersBusiness
{
    public async Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct) =>
        await userService.GetByIdAsync(userId, ct);

    public async Task<User?> GetUserByUsernameAsync(string username, CancellationToken ct) =>
        await userService.GetByUsernameAsync(username, ct);

    public async Task<User?> GetCurrentUserAsync(string supabaseUserId, CancellationToken ct) =>
        await currentUserService.GetCurrentUserAsync(supabaseUserId, ct);

    public Task<(int BytesCount, int FollowersCount, int FollowingCount)> GetUserStatsAsync(Guid userId, CancellationToken ct) =>
        userService.GetUserStatsAsync(userId, ct);

    public Task<bool> IsFollowingAsync(Guid followerId, Guid targetUserId, CancellationToken ct) =>
        userService.IsFollowingAsync(followerId, targetUserId, ct);

    public async Task<PagedResult<User>> GetFollowersAsync(Guid userId, int page, int pageSize, CancellationToken ct) =>
        await userService.GetFollowersAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);

    public async Task<PagedResult<User>> GetFollowingAsync(Guid userId, int page, int pageSize, CancellationToken ct) =>
        await userService.GetFollowingAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);

    public async Task<User> UpdateProfileAsync(string supabaseUserId, Guid userId, string? displayName, string? bio, CancellationToken ct)
    {
        var requestingId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (requestingId is null || requestingId != userId)
            throw new UnauthorizedAccessException("You may only update your own profile.");
        return await userService.UpdateProfileAsync(userId, displayName, bio, ct);
    }

    public async Task<User> ProvisionUserAsync(string supabaseUserId, string displayName, string? avatarUrl, string? email, CancellationToken ct)
    {
        var (user, wasCreated) = await userService.ProvisionAsync(supabaseUserId, displayName, avatarUrl, email, ct);
        if (wasCreated)
            await badgeService.CheckAndAwardAsync(user.Id, BadgeTrigger.UserRegistered, ct);
        return user;
    }

    public Task<bool> DeleteUserAsync(string supabaseUserId, CancellationToken ct) =>
        userService.DeleteBySupabaseUserIdAsync(supabaseUserId, ct);

    public async Task<User> UpdateMyProfileAsync(
        string supabaseUserId,
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
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct)
            ?? throw new UnauthorizedAccessException("User not found for the given Clerk ID.");

        return await userService.UpdateMyProfileAsync(userId, username, displayName, bio, company, roleTitle, seniority, domain, techStack, customAvatarUrl, ct);
    }

    public async Task<List<Social>> GetMySocialsAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct)
            ?? throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        return await userService.GetUserSocialsAsync(userId, ct);
    }

    public async Task UpsertMySocialsAsync(string supabaseUserId, List<(string Platform, string Url, string? Label)> socials, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct)
            ?? throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        await userService.UpsertUserSocialsAsync(userId, socials, ct);
    }
}
