using System.Text.Json;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.FeatureFlags;
using ByteAI.Core.Services.Supabase;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Business;

public sealed class AdminBusiness(
    IFeatureFlagService featureFlagService,
    ISupabaseAdminService supabaseAdmin,
    ILogger<AdminBusiness> logger,
    AppDbContext db) : IAdminBusiness
{
    private static readonly HashSet<string> ReservedRoles = ["user", "admin"];

    public async Task<UserActivityResponse> GetUserActivityAsync(int page, int pageSize, CancellationToken ct)
    {
        var offset = (page - 1) * pageSize;

        var todayCount  = await db.LoggedInToday.CountAsync(ct);
        var todayItems  = await db.LoggedInToday
            .OrderByDescending(u => u.ActivityAt)
            .Skip(offset).Take(pageSize)
            .Select(u => new ActivityUserDto(u.UserId, u.DisplayName, u.Username, u.AvatarUrl, u.Email, u.ActivityAt))
            .ToListAsync(ct);

        var onlineCount = await db.CurrentlyLoggedIn.CountAsync(ct);
        var onlineItems = await db.CurrentlyLoggedIn
            .OrderByDescending(u => u.ActivityAt)
            .Skip(offset).Take(pageSize)
            .Select(u => new ActivityUserDto(u.UserId, u.DisplayName, u.Username, u.AvatarUrl, u.Email, u.ActivityAt))
            .ToListAsync(ct);

        return new UserActivityResponse(
            LoggedInToday:     new ActivityPagedResult(todayItems,  todayCount,  page, pageSize),
            CurrentlyLoggedIn: new ActivityPagedResult(onlineItems, onlineCount, page, pageSize));
    }

    public Task<List<FeatureFlagType>> GetAllFeatureFlagsAsync(CancellationToken ct) =>
        featureFlagService.GetAllAsync(ct);

    public Task<List<FeatureFlagType>> GetEnabledFeatureFlagsAsync(string? supabaseUserId, CancellationToken ct) =>
        featureFlagService.GetEnabledAsync(supabaseUserId, ct);

    public Task<FeatureFlagType> UpsertFeatureFlagAsync(string key, string name, string? description, bool globalOpen, CancellationToken ct) =>
        featureFlagService.UpsertAsync(key, name, description, globalOpen, ct);

    public Task<FeatureFlagType> SetFeatureFlagEnabledAsync(string key, bool globalOpen, CancellationToken ct) =>
        featureFlagService.SetEnabledAsync(key, globalOpen, ct);

    public Task<bool> DeleteFeatureFlagAsync(string key, CancellationToken ct) =>
        featureFlagService.DeleteAsync(key, ct);

    public Task AssignFeatureFlagToUserAsync(string key, Guid userId, CancellationToken ct) =>
        featureFlagService.AssignToUserAsync(key, userId, ct);

    public Task RemoveFeatureFlagFromUserAsync(string key, Guid userId, CancellationToken ct) =>
        featureFlagService.RemoveFromUserAsync(key, userId, ct);

    public Task<List<string>> GetUserAssignedFeatureFlagsAsync(Guid userId, CancellationToken ct) =>
        featureFlagService.GetUserAssignedFlagsAsync(userId, ct);

    // ── Role management ──────────────────────────────────────────────────────

    public Task<List<RoleType>> GetAllRolesAsync(CancellationToken ct) =>
        db.RoleTypes.AsNoTracking()
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

    public async Task<RoleType> CreateRoleAsync(string name, string label, string? description, CancellationToken ct)
    {
        var slug = name.Trim().ToLower().Replace(' ', '-');
        if (ReservedRoles.Contains(slug))
            throw new InvalidOperationException($"Role name '{slug}' is reserved and cannot be created.");

        var existing = await db.RoleTypes.AnyAsync(r => r.Name == slug, ct);
        if (existing)
            throw new InvalidOperationException($"A role with name '{slug}' already exists.");

        var role = new RoleType { Name = slug, Label = label.Trim(), Description = description?.Trim() };
        db.RoleTypes.Add(role);
        await db.SaveChangesAsync(ct);
        return role;
    }

    public async Task<List<RoleType>> GetUserRolesAsync(Guid userId, CancellationToken ct) =>
        await db.UserRoles.AsNoTracking()
            .Where(ur => ur.UserId == userId)
            .Include(ur => ur.RoleType)
            .Select(ur => ur.RoleType)
            .ToListAsync(ct);

    public async Task AssignRoleToUserAsync(Guid userId, Guid roleId, CancellationToken ct)
    {
        var role = await db.RoleTypes.FindAsync([roleId], ct)
            ?? throw new KeyNotFoundException($"Role {roleId} not found.");

        var alreadyAssigned = await db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleTypeId == roleId, ct);
        if (alreadyAssigned) return;

        db.UserRoles.Add(new UserRole { UserId = userId, RoleTypeId = roleId });
        await db.SaveChangesAsync(ct);
    }

    public async Task RevokeRoleFromUserAsync(Guid userId, Guid roleId, CancellationToken ct)
    {
        var role = await db.RoleTypes.FindAsync([roleId], ct)
            ?? throw new KeyNotFoundException($"Role {roleId} not found.");

        if (role.Name == "user")
            throw new InvalidOperationException("The 'user' role cannot be revoked.");

        var entry = await db.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleTypeId == roleId, ct);
        if (entry is null) return;

        db.UserRoles.Remove(entry);
        await db.SaveChangesAsync(ct);
    }

    // ── Moderation watchlist & bans ──────────────────────────────────────────

    public async Task<List<FlaggedUserDto>> GetFlaggedUsersAsync(int threshold, CancellationToken ct)
    {
        var bannedIds = await db.UserBans
            .AsNoTracking()
            .Where(b => b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow)
            .Select(b => b.UserId)
            .ToListAsync(ct)
            .ContinueWith(t => t.Result.ToHashSet(), ct);

        // Two queries: counts first, then content-type breakdown for those authors.
        var counts = await db.FlaggedContents
            .AsNoTracking()
            .Where(f => f.ContentAuthorId != null)
            .GroupBy(f => f.ContentAuthorId!.Value)
            .Where(g => g.Count() > threshold)
            .Select(g => new { AuthorId = g.Key, FlagCount = g.Count() })
            .ToListAsync(ct);

        if (counts.Count == 0) return [];

        var authorIds = counts.Select(r => r.AuthorId).ToList();

        var typeRows = await db.FlaggedContents
            .AsNoTracking()
            .Where(f => f.ContentAuthorId != null && authorIds.Contains(f.ContentAuthorId.Value))
            .Select(f => new { AuthorId = f.ContentAuthorId!.Value, f.ContentType })
            .Distinct()
            .ToListAsync(ct);

        var typesByAuthor = typeRows
            .GroupBy(r => r.AuthorId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(r => r.ContentType).ToList());

        var users = await db.Users
            .AsNoTracking()
            .Where(u => authorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username, u.DisplayName, u.AvatarUrl })
            .ToDictionaryAsync(u => u.Id, ct);

        return counts
            .Select(r =>
            {
                users.TryGetValue(r.AuthorId, out var u);
                return new FlaggedUserDto(
                    UserId:       r.AuthorId,
                    Username:     u?.Username ?? "unknown",
                    DisplayName:  u?.DisplayName,
                    AvatarUrl:    u?.AvatarUrl,
                    FlagCount:    r.FlagCount,
                    ContentTypes: typesByAuthor.GetValueOrDefault(r.AuthorId, []),
                    IsBanned:     bannedIds.Contains(r.AuthorId));
            })
            .OrderByDescending(d => d.FlagCount)
            .ToList();
    }

    public async Task<List<BannedUserDto>> GetBannedUsersAsync(CancellationToken ct)
    {
        var bans = await db.UserBans
            .AsNoTracking()
            .Where(b => b.ExpiresAt == null || b.ExpiresAt > DateTime.UtcNow)
            .Include(b => b.User)
            .ToListAsync(ct);

        return bans.Select(b => new BannedUserDto(
            UserId:      b.UserId,
            Username:    b.User?.Username ?? "unknown",
            DisplayName: b.User?.DisplayName,
            AvatarUrl:   b.User?.AvatarUrl,
            Reason:      b.Reason,
            BannedAt:    b.BannedAt,
            ExpiresAt:   b.ExpiresAt))
            .ToList();
    }

    public async Task<UserBanDto> BanUserAsync(Guid userId, string reason, Guid adminId, DateTime? expiresAt, CancellationToken ct)
    {
        // Always store as UTC so the BanEnforcementMiddleware's "expires_at > now()"
        // comparison is unambiguous regardless of how the admin's client serialised it.
        var normalizedExpiresAt = NormalizeUtc(expiresAt);
        var now = DateTime.UtcNow;

        // ── Look up the user's Supabase ID before opening the transaction; we need
        //    it later for SignOut + ban_duration calls but those are network I/O.
        var supabaseUserId = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.SupabaseUserId)
            .FirstOrDefaultAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // ── 1. Close any prior open history row, then append the new one.
        await db.UserBanHistories
            .Where(h => h.UserId == userId && h.LiftedAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.LiftedAt, now)
                .SetProperty(h => h.LiftedBy, (Guid?)adminId), ct);

        db.UserBanHistories.Add(new UserBanHistory
        {
            UserId    = userId,
            Reason    = reason,
            BannedAt  = now,
            ExpiresAt = normalizedExpiresAt,
            BannedBy  = adminId,
        });

        // ── 2. Upsert the active-ban projection row.
        var existing = await db.UserBans.FindAsync([userId], ct);
        if (existing is not null)
        {
            existing.Reason    = reason;
            existing.BannedAt  = now;
            existing.ExpiresAt = normalizedExpiresAt;
            existing.BannedBy  = adminId;
        }
        else
        {
            db.UserBans.Add(new UserBan
            {
                UserId    = userId,
                Reason    = reason,
                BannedAt  = now,
                ExpiresAt = normalizedExpiresAt,
                BannedBy  = adminId,
            });
        }

        // ── 3. Cascade-hide bytes & interviews (audit each so we can restore on unban).
        var byteIds = await db.Bytes
            .Where(b => b.AuthorId == userId)            // global filter already excludes is_hidden=true
            .Select(b => b.Id)
            .ToListAsync(ct);

        if (byteIds.Count > 0)
        {
            await db.Bytes.IgnoreQueryFilters()
                .Where(b => byteIds.Contains(b.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsHidden, true), ct);

            db.BanHiddenContents.AddRange(byteIds.Select(id => new BanHiddenContent
            {
                UserId      = userId,
                ContentType = "byte",
                ContentId   = id,
                HiddenAt    = now,
            }));
        }

        var interviewIds = await db.Interviews
            .Where(i => i.AuthorId == userId)
            .Select(i => i.Id)
            .ToListAsync(ct);

        if (interviewIds.Count > 0)
        {
            await db.Interviews.IgnoreQueryFilters()
                .Where(i => interviewIds.Contains(i.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsHidden, true), ct);

            db.BanHiddenContents.AddRange(interviewIds.Select(id => new BanHiddenContent
            {
                UserId      = userId,
                ContentType = "interview",
                ContentId   = id,
                HiddenAt    = now,
            }));
        }

        // ── 4. Hard-delete comments (no audit, no restore). The migration changed
        //       parent_id FKs to ON DELETE SET NULL, so other users' replies are
        //       preserved as flat root-level comments instead of being cascade-deleted.
        await db.Comments.Where(c => c.AuthorId == userId).ExecuteDeleteAsync(ct);
        await db.InterviewComments.Where(c => c.AuthorId == userId).ExecuteDeleteAsync(ct);
        await db.InterviewQuestionComments.Where(c => c.AuthorId == userId).ExecuteDeleteAsync(ct);

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        // ── 5. Supabase: revoke sessions and set ban_duration. These are network calls
        //       and must NOT roll back the local transaction — our middleware blocks
        //       even if Supabase calls fail. Both methods log on failure rather than throw.
        if (!string.IsNullOrEmpty(supabaseUserId))
        {
            try
            {
                var duration = normalizedExpiresAt is null
                    ? TimeSpan.MaxValue                          // permanent → "876000h" inside the service
                    : normalizedExpiresAt.Value - now;
                await supabaseAdmin.SetAuthUserBanAsync(supabaseUserId, duration, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "SetAuthUserBanAsync failed for user {UserId}", userId);
            }

            try
            {
                await supabaseAdmin.SignOutAllSessionsAsync(supabaseUserId, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "SignOutAllSessionsAsync failed for user {UserId}", userId);
            }
        }
        else
        {
            logger.LogWarning(
                "Banned user {UserId} has no SupabaseUserId; cannot revoke sessions or set Supabase ban_duration.",
                userId);
        }

        return new UserBanDto(userId, reason, now, normalizedExpiresAt);
    }

    public async Task UnbanUserAsync(Guid userId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        var supabaseUserId = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.SupabaseUserId)
            .FirstOrDefaultAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // ── 1. Close the open history row.
        await db.UserBanHistories
            .Where(h => h.UserId == userId && h.LiftedAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.LiftedAt, now), ct);

        // ── 2. Restore previously-hidden bytes & interviews from the audit table.
        var auditRows = await db.BanHiddenContents
            .Where(r => r.UserId == userId)
            .ToListAsync(ct);

        if (auditRows.Count > 0)
        {
            var byteIds = auditRows.Where(r => r.ContentType == "byte")
                                   .Select(r => r.ContentId).ToList();
            var interviewIds = auditRows.Where(r => r.ContentType == "interview")
                                        .Select(r => r.ContentId).ToList();

            if (byteIds.Count > 0)
            {
                await db.Bytes.IgnoreQueryFilters()
                    .Where(b => byteIds.Contains(b.Id))
                    .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsHidden, false), ct);
            }

            if (interviewIds.Count > 0)
            {
                await db.Interviews.IgnoreQueryFilters()
                    .Where(i => interviewIds.Contains(i.Id))
                    .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsHidden, false), ct);
            }

            db.BanHiddenContents.RemoveRange(auditRows);
        }

        // ── 3. Drop the active-ban projection row.
        var ban = await db.UserBans.FindAsync([userId], ct);
        if (ban is not null) db.UserBans.Remove(ban);

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        // ── 4. Lift the Supabase ban so the user can sign in again.
        if (!string.IsNullOrEmpty(supabaseUserId))
        {
            try
            {
                await supabaseAdmin.SetAuthUserBanAsync(supabaseUserId, null, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "SetAuthUserBanAsync (lift) failed for user {UserId}", userId);
            }
        }
    }

    /// <summary>
    /// Coerces an incoming DateTime to UTC. Without this, an admin's client that
    /// serialises a "datetime-local" value with no offset would land here with
    /// Kind=Unspecified and be compared inconsistently against DateTime.UtcNow.
    /// </summary>
    private static DateTime? NormalizeUtc(DateTime? dt) => dt switch
    {
        null                                       => null,
        { Kind: DateTimeKind.Utc } v               => v,
        { Kind: DateTimeKind.Unspecified } v       => DateTime.SpecifyKind(v, DateTimeKind.Utc),
        var v                                      => v.Value.ToUniversalTime(),
    };

    // ── Flag triage ──────────────────────────────────────────────────────────

    public async Task<PagedResult<FlaggedContentDto>> GetFlaggedContentAsync(
        FlagFilter filter, int page, int pageSize, CancellationToken ct)
    {
        var q = db.FlaggedContents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(filter.Status))      q = q.Where(f => f.Status      == filter.Status);
        if (!string.IsNullOrEmpty(filter.ContentType)) q = q.Where(f => f.ContentType == filter.ContentType);
        if (!string.IsNullOrEmpty(filter.Severity))    q = q.Where(f => f.Severity    == filter.Severity);
        if (filter.AuthorId.HasValue)                  q = q.Where(f => f.ContentAuthorId == filter.AuthorId);
        if (filter.From.HasValue)                      q = q.Where(f => f.CreatedAt >= filter.From.Value);
        if (filter.To.HasValue)                        q = q.Where(f => f.CreatedAt <= filter.To.Value);

        var total = await q.CountAsync(ct);
        var rows  = await q.OrderByDescending(f => f.CreatedAt)
                           .Skip((page - 1) * pageSize)
                           .Take(pageSize)
                           .ToListAsync(ct);

        var items = await HydrateFlagsAsync(rows, ct);
        return new PagedResult<FlaggedContentDto>(items, total, page, pageSize);
    }

    public async Task<List<FlaggedContentDto>> GetUserFlagsAsync(Guid userId, CancellationToken ct)
    {
        var rows = await db.FlaggedContents.AsNoTracking()
            .Where(f => f.ContentAuthorId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);

        return await HydrateFlagsAsync(rows, ct);
    }

    public async Task<FlaggedContentDto?> UpdateFlagStatusAsync(
        Guid flagId, string status, string? note, Guid adminId, CancellationToken ct)
    {
        var allowed = new[] { "open", "reviewing", "removed", "dismissed" };
        if (!allowed.Contains(status))
            throw new ArgumentException($"Invalid status '{status}'. Allowed: {string.Join(", ", allowed)}");

        var row = await db.FlaggedContents.FirstOrDefaultAsync(f => f.Id == flagId, ct);
        if (row is null) return null;

        row.Status = status;
        if (status is "removed" or "dismissed")
        {
            row.ResolvedAt = DateTime.UtcNow;
            row.ResolvedBy = adminId;
        }
        else
        {
            row.ResolvedAt = null;
            row.ResolvedBy = null;
        }

        if (!string.IsNullOrWhiteSpace(note))
        {
            // Append the admin note onto the metadata JSON without disturbing existing fields.
            row.Metadata = MergeNoteIntoMetadata(row.Metadata, note);
        }

        // ── If admin chose "removed" and we have a real source row, hide it.
        //    Bytes / interviews → IsHidden=true. Comments → hard-delete.
        //    The three comment surfaces live in different tables; the differentiated
        //    content_type ("comment" / "interview_comment" / "interview_question_comment")
        //    routes directly. The legacy "comment" value (written before the enum split)
        //    falls back to a best-effort fan-out across all three tables — at most one
        //    matches by primary key, the others no-op.
        if (status == "removed" && row.ContentId != Guid.Empty)
        {
            switch (row.ContentType)
            {
                case "byte":
                    await db.Bytes.IgnoreQueryFilters()
                        .Where(b => b.Id == row.ContentId)
                        .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsHidden, true), ct);
                    break;
                case "interview":
                    await db.Interviews.IgnoreQueryFilters()
                        .Where(i => i.Id == row.ContentId)
                        .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsHidden, true), ct);
                    break;
                case "comment":
                    // Legacy fan-out for rows written before the enum split.
                    await db.Comments.Where(c => c.Id == row.ContentId).ExecuteDeleteAsync(ct);
                    await db.InterviewComments.Where(c => c.Id == row.ContentId).ExecuteDeleteAsync(ct);
                    await db.InterviewQuestionComments.Where(c => c.Id == row.ContentId).ExecuteDeleteAsync(ct);
                    break;
                case "interview_comment":
                    await db.InterviewComments.Where(c => c.Id == row.ContentId).ExecuteDeleteAsync(ct);
                    break;
                case "interview_question_comment":
                    await db.InterviewQuestionComments.Where(c => c.Id == row.ContentId).ExecuteDeleteAsync(ct);
                    break;
            }
        }

        await db.SaveChangesAsync(ct);

        var hydrated = await HydrateFlagsAsync(new[] { row }, ct);
        return hydrated.FirstOrDefault();
    }

    public async Task<List<FlagsByAuthorEntryDto>> GetFlagsByAuthorAsync(
        int page, int pageSize, CancellationToken ct)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 20;

        // Aggregate open flags per author. Mix user reports + auto-flags.
        var groups = await db.FlaggedContents.AsNoTracking()
            .Where(f => f.Status == "open" && f.ContentAuthorId != null)
            .GroupBy(f => f.ContentAuthorId!.Value)
            .Select(g => new
            {
                AuthorId = g.Key,
                TotalFlags = g.Count(),
                UserReports = g.Count(f => f.ReasonCode == "USER_REPORT"),
                AutoFlags = g.Count(f => f.ReasonCode != "USER_REPORT"),
                LastFlaggedAt = g.Max(f => f.CreatedAt),
            })
            .OrderByDescending(r => r.TotalFlags)
            .ThenByDescending(r => r.LastFlaggedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        if (groups.Count == 0) return [];

        var authorIds = groups.Select(g => g.AuthorId).ToList();
        var users = await db.Users.AsNoTracking()
            .Where(u => authorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username, u.DisplayName, u.AvatarUrl })
            .ToDictionaryAsync(u => u.Id, ct);

        return groups.Select(g =>
        {
            users.TryGetValue(g.AuthorId, out var u);
            return new FlagsByAuthorEntryDto(
                AuthorId: g.AuthorId,
                Username: u?.Username ?? "unknown",
                DisplayName: u?.DisplayName,
                AvatarUrl: u?.AvatarUrl,
                TotalFlags: g.TotalFlags,
                UserReports: g.UserReports,
                AutoFlags: g.AutoFlags,
                LastFlaggedAt: g.LastFlaggedAt);
        }).ToList();
    }

    public async Task<List<FlagsByReporterEntryDto>> GetFlagsByReporterAsync(
        int page, int pageSize, CancellationToken ct)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 20;

        // Group user-reports by reporter. Auto-flags excluded — they have no reporter.
        var groups = await db.FlaggedContents.AsNoTracking()
            .Where(f => f.ReasonCode == "USER_REPORT" && f.ReporterUserId != null)
            .GroupBy(f => f.ReporterUserId!.Value)
            .Select(g => new
            {
                ReporterId = g.Key,
                TotalReports = g.Count(),
                DismissedCount = g.Count(f => f.Status == "dismissed"),
                LastReportedAt = g.Max(f => f.CreatedAt),
            })
            .OrderByDescending(r => r.TotalReports)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        if (groups.Count == 0) return [];

        var reporterIds = groups.Select(g => g.ReporterId).ToList();
        var users = await db.Users.AsNoTracking()
            .Where(u => reporterIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username, u.DisplayName, u.AvatarUrl })
            .ToDictionaryAsync(u => u.Id, ct);

        return groups.Select(g =>
        {
            users.TryGetValue(g.ReporterId, out var u);
            var rate = g.TotalReports == 0 ? 0d : (double)g.DismissedCount / g.TotalReports;
            return new FlagsByReporterEntryDto(
                ReporterId: g.ReporterId,
                Username: u?.Username ?? "unknown",
                DisplayName: u?.DisplayName,
                AvatarUrl: u?.AvatarUrl,
                TotalReports: g.TotalReports,
                DismissedCount: g.DismissedCount,
                DismissRate: rate,
                LastReportedAt: g.LastReportedAt);
        }).ToList();
    }

    public async Task<List<UserBanHistoryDto>> GetUserBanHistoryAsync(Guid userId, CancellationToken ct)
    {
        var rows = await db.UserBanHistories.AsNoTracking()
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.BannedAt)
            .ToListAsync(ct);

        // Resolve admin usernames for display.
        var adminIds = rows
            .SelectMany(h => new[] { h.BannedBy, h.LiftedBy })
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .Distinct()
            .ToList();

        var admins = adminIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.Users.AsNoTracking()
                .Where(u => adminIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Username, ct);

        return rows.Select(h => new UserBanHistoryDto(
            h.Id, h.UserId, h.Reason, h.BannedAt, h.ExpiresAt,
            h.BannedBy, h.BannedBy.HasValue ? admins.GetValueOrDefault(h.BannedBy.Value) : null,
            h.LiftedAt,
            h.LiftedBy, h.LiftedBy.HasValue ? admins.GetValueOrDefault(h.LiftedBy.Value) : null))
            .ToList();
    }

    // ── Private hydration helpers ────────────────────────────────────────────

    private async Task<List<FlaggedContentDto>> HydrateFlagsAsync(
        IReadOnlyList<FlaggedContent> rows, CancellationToken ct)
    {
        if (rows.Count == 0) return [];

        var userIds = rows
            .SelectMany(f => new[] { f.ContentAuthorId, f.ReporterUserId })
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .Distinct()
            .ToList();

        var users = userIds.Count == 0
            ? new Dictionary<Guid, (string Username, string? DisplayName, string? AvatarUrl)>()
            : await db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(
                    u => u.Id,
                    u => (u.Username, u.DisplayName, u.AvatarUrl),
                    ct);

        return rows.Select(f =>
        {
            var excerpt = ExtractExcerptFromMetadata(f.Metadata);
            (string Username, string? DisplayName, string? AvatarUrl)? author = f.ContentAuthorId.HasValue
                && users.TryGetValue(f.ContentAuthorId.Value, out var a) ? a : null;
            (string Username, string? DisplayName, string? AvatarUrl)? reporter = f.ReporterUserId.HasValue
                && users.TryGetValue(f.ReporterUserId.Value, out var r) ? r : null;

            return new FlaggedContentDto(
                f.Id, f.ContentType, f.ContentId,
                f.ReasonCode, f.ReasonMessage, f.Severity, f.Status,
                excerpt,
                f.ContentAuthorId, author?.Username, author?.DisplayName, author?.AvatarUrl,
                f.ReporterUserId, reporter?.Username,
                f.CreatedAt, f.ResolvedAt, f.ResolvedBy);
        }).ToList();
    }

    private static string? ExtractExcerptFromMetadata(string? metadata)
    {
        if (string.IsNullOrWhiteSpace(metadata)) return null;
        try
        {
            using var doc = JsonDocument.Parse(metadata);
            return doc.RootElement.TryGetProperty("excerpt", out var v) && v.ValueKind == JsonValueKind.String
                ? v.GetString()
                : null;
        }
        catch { return null; }
    }

    private static string MergeNoteIntoMetadata(string? existingJson, string note)
    {
        var dict = new Dictionary<string, object?>();
        if (!string.IsNullOrWhiteSpace(existingJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(existingJson);
                foreach (var p in doc.RootElement.EnumerateObject())
                {
                    dict[p.Name] = p.Value.ValueKind switch
                    {
                        JsonValueKind.String => p.Value.GetString(),
                        JsonValueKind.True   => true,
                        JsonValueKind.False  => false,
                        JsonValueKind.Number => p.Value.GetDouble(),
                        _                    => p.Value.GetRawText(),
                    };
                }
            }
            catch { /* fall through — overwrite with new metadata */ }
        }
        dict["adminNote"] = note;
        dict["adminNoteAt"] = DateTime.UtcNow.ToString("O");
        return JsonSerializer.Serialize(dict);
    }
}
