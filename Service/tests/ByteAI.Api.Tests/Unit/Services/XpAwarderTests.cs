using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class XpAwarderTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly NullLogger _logger = NullLogger.Instance;

    private readonly Guid _userId = Guid.NewGuid();

    public XpAwarderTests()
    {
        _db = DbContextFactory.Create();
        // Seed a user
        _db.Users.Add(new User
        {
            Id = _userId,
            SupabaseUserId = "clerk_xp",
            Username = "xpuser",
            DisplayName = "Xp User",
            Xp = 0
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private void SeedXpAction(string name, int amount, bool isOneTime = false, bool isActive = true)
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = name,
            Label = name,
            XpAmount = amount,
            IsOneTime = isOneTime,
            IsActive = isActive
        });
        _db.SaveChanges();
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Award_KnownAction_AddsXpToUserAndLogsEntry()
    {
        SeedXpAction("post_byte", 10);

        await XpAwarder.AwardAsync(_db, _userId, "post_byte", _logger);

        var user = await _db.Users.FindAsync([_userId]);
        Assert.Equal(10, user!.Xp);

        var log = _db.UserXpLogs.FirstOrDefault(l => l.UserId == _userId && l.ActionName == "post_byte");
        Assert.NotNull(log);
        Assert.Equal(10, log.XpAmount);
    }

    // ── One-time guard ────────────────────────────────────────────────────────

    [Fact]
    public async Task Award_OneTimeAction_OnlyAwardsOnce()
    {
        SeedXpAction("first_byte", 50, isOneTime: true);

        await XpAwarder.AwardAsync(_db, _userId, "first_byte", _logger);
        await XpAwarder.AwardAsync(_db, _userId, "first_byte", _logger);

        var user = await _db.Users.FindAsync([_userId]);
        Assert.Equal(50, user!.Xp); // only 50, not 100
    }

    // ── Daily guard (daily_login) ─────────────────────────────────────────────

    [Fact]
    public async Task Award_DailyLogin_OnlyAwardsOncePerDay()
    {
        SeedXpAction("daily_login", 5);

        await XpAwarder.AwardAsync(_db, _userId, "daily_login", _logger);
        await XpAwarder.AwardAsync(_db, _userId, "daily_login", _logger);

        var user = await _db.Users.FindAsync([_userId]);
        Assert.Equal(5, user!.Xp); // only once
    }

    // ── Unknown action ────────────────────────────────────────────────────────

    [Fact]
    public async Task Award_UnknownAction_DoesNothing_NoThrow()
    {
        // No action seeded - should just log warning and return
        await XpAwarder.AwardAsync(_db, _userId, "nonexistent_action", _logger);

        var user = await _db.Users.FindAsync([_userId]);
        Assert.Equal(0, user!.Xp);
    }

    // ── Inactive action ───────────────────────────────────────────────────────

    [Fact]
    public async Task Award_InactiveAction_DoesNotAwardXp()
    {
        SeedXpAction("disabled_action", 20, isActive: false);

        await XpAwarder.AwardAsync(_db, _userId, "disabled_action", _logger);

        var user = await _db.Users.FindAsync([_userId]);
        Assert.Equal(0, user!.Xp);
    }

    // ── Missing user ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Award_UserNotInDb_DoesNotThrow()
    {
        SeedXpAction("post_byte", 10);
        var ghostId = Guid.NewGuid();

        // Should log error but not throw
        await XpAwarder.AwardAsync(_db, ghostId, "post_byte", _logger);
    }

    // ── Multiple repeated non-one-time ────────────────────────────────────────

    [Fact]
    public async Task Award_RegularActionMultipleTimes_AccumulatesXp()
    {
        SeedXpAction("receive_reaction", 2);

        await XpAwarder.AwardAsync(_db, _userId, "receive_reaction", _logger);
        await XpAwarder.AwardAsync(_db, _userId, "receive_reaction", _logger);
        await XpAwarder.AwardAsync(_db, _userId, "receive_reaction", _logger);

        var user = await _db.Users.FindAsync([_userId]);
        Assert.Equal(6, user!.Xp); // 3 × 2
    }
}
