using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IAdminBusiness
{
    Task<UserActivityResponse> GetUserActivityAsync(int page, int pageSize, CancellationToken ct);
    Task<List<FeatureFlagType>> GetAllFeatureFlagsAsync(CancellationToken ct);
    Task<List<FeatureFlagType>> GetEnabledFeatureFlagsAsync(string? supabaseUserId, CancellationToken ct);
    Task<FeatureFlagType> UpsertFeatureFlagAsync(string key, string name, string? description, bool globalOpen, CancellationToken ct);
    Task<FeatureFlagType> SetFeatureFlagEnabledAsync(string key, bool globalOpen, CancellationToken ct);
    Task<bool> DeleteFeatureFlagAsync(string key, CancellationToken ct);
    Task AssignFeatureFlagToUserAsync(string key, Guid userId, CancellationToken ct);
    Task RemoveFeatureFlagFromUserAsync(string key, Guid userId, CancellationToken ct);
    Task<List<string>> GetUserAssignedFeatureFlagsAsync(Guid userId, CancellationToken ct);

    // Role management
    Task<List<RoleType>> GetAllRolesAsync(CancellationToken ct);
    Task<RoleType> CreateRoleAsync(string name, string label, string? description, CancellationToken ct);
    Task<List<RoleType>> GetUserRolesAsync(Guid userId, CancellationToken ct);
    Task AssignRoleToUserAsync(Guid userId, Guid roleId, CancellationToken ct);
    Task RevokeRoleFromUserAsync(Guid userId, Guid roleId, CancellationToken ct);

    // Moderation watchlist & bans
    Task<List<FlaggedUserDto>> GetFlaggedUsersAsync(int threshold, CancellationToken ct);
    Task<List<BannedUserDto>> GetBannedUsersAsync(CancellationToken ct);
    Task<UserBanDto> BanUserAsync(Guid userId, string reason, Guid adminId, DateTime? expiresAt, CancellationToken ct);
    Task UnbanUserAsync(Guid userId, CancellationToken ct);

    // Flag triage
    Task<PagedResult<FlaggedContentDto>> GetFlaggedContentAsync(
        FlagFilter filter, int page, int pageSize, CancellationToken ct);
    Task<List<FlaggedContentDto>> GetUserFlagsAsync(Guid userId, CancellationToken ct);
    Task<FlaggedContentDto?> UpdateFlagStatusAsync(
        Guid flagId, string status, string? note, Guid adminId, CancellationToken ct);

    // Ban history
    Task<List<UserBanHistoryDto>> GetUserBanHistoryAsync(Guid userId, CancellationToken ct);
}

public sealed record FlaggedUserDto(
    Guid UserId,
    string Username,
    string? DisplayName,
    string? AvatarUrl,
    int FlagCount,
    IReadOnlyList<string> ContentTypes,
    bool IsBanned);

public sealed record BannedUserDto(
    Guid UserId,
    string Username,
    string? DisplayName,
    string? AvatarUrl,
    string Reason,
    DateTime BannedAt,
    DateTime? ExpiresAt);

public sealed record UserBanDto(
    Guid UserId,
    string Reason,
    DateTime BannedAt,
    DateTime? ExpiresAt);

public sealed record UserBanHistoryDto(
    Guid Id,
    Guid UserId,
    string Reason,
    DateTime BannedAt,
    DateTime? ExpiresAt,
    Guid? BannedBy,
    string? BannedByUsername,
    DateTime? LiftedAt,
    Guid? LiftedBy,
    string? LiftedByUsername);

public sealed record FlaggedContentDto(
    Guid Id,
    string ContentType,
    Guid ContentId,
    string ReasonCode,
    string? ReasonMessage,
    string Severity,
    string Status,
    string? Excerpt,
    Guid? AuthorId,
    string? AuthorUsername,
    string? AuthorDisplayName,
    string? AuthorAvatarUrl,
    Guid? ReporterId,
    string? ReporterUsername,
    DateTime CreatedAt,
    DateTime? ResolvedAt,
    Guid? ResolvedBy);

/// <summary>
/// Filter for the admin flag-triage list endpoint. Every field is optional —
/// callers narrow as much as they like; an unset filter returns the full queue
/// in created-at order.
/// </summary>
public sealed record FlagFilter(
    string? Status      = null,        // 'open' | 'reviewing' | 'removed' | 'dismissed'
    string? ContentType = null,        // 'byte' | 'comment' | 'interview' | 'chat' | 'support' | 'profile'
    string? Severity    = null,        // 'low' | 'medium' | 'high'
    Guid?   AuthorId    = null,
    DateTime? From      = null,
    DateTime? To        = null);
