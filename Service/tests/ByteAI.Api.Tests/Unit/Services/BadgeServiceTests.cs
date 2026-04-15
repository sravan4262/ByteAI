using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.Badges;
using Microsoft.Extensions.Logging.Abstractions;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class BadgeServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly BadgeService _sut;

    private readonly Guid _userId = Guid.NewGuid();

    public BadgeServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new BadgeService(_db, NullLogger<BadgeService>.Instance);

        // Seed the user
        _db.Users.Add(new User
        {
            Id = _userId,
            ClerkId = "clerk_badge",
            Username = "badgeuser",
            DisplayName = "Badge User",
            Xp = 0,
            Streak = 0
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private BadgeType SeedBadge(string name, string label)
    {
        var badge = new BadgeType { Id = Guid.NewGuid(), Name = name, Label = label };
        _db.BadgeTypes.Add(badge);
        _db.SaveChanges();
        return badge;
    }

    // ── UserRegistered — early_adopter ────────────────────────────────────────

    [Fact]
    public async Task CheckAndAward_UserRegistered_AwardsEarlyAdopterBadge()
    {
        SeedBadge("early_adopter", "Early Adopter");

        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.UserRegistered, default);

        Assert.Single(awarded);
        Assert.Equal("early_adopter", awarded[0].Name);

        // Badge persisted
        var badge = _db.UserBadges.FirstOrDefault(ub => ub.UserId == _userId);
        Assert.NotNull(badge);
        Assert.Equal("early_adopter", badge.BadgeType);
    }

    [Fact]
    public async Task CheckAndAward_UserRegistered_EarlyAdopter_OnlyAwardedOnce()
    {
        SeedBadge("early_adopter", "Early Adopter");

        await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.UserRegistered, default);
        var second = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.UserRegistered, default);

        Assert.Empty(second); // already earned, so 0 new awards
    }

    // ── BytePosted — first_byte ───────────────────────────────────────────────

    [Fact]
    public async Task CheckAndAward_BytePosted_FirstByte_AwardedWhenExactlyOneByte()
    {
        SeedBadge("first_byte", "First Byte");

        // Seed exactly one active byte for this user
        _db.Bytes.Add(new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _userId,
            Title = "My First Byte",
            Body = "content",
            Type = "article",
            IsActive = true
        });
        _db.SaveChanges();

        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.BytePosted, default);

        Assert.Single(awarded);
        Assert.Equal("first_byte", awarded[0].Name);
    }

    [Fact]
    public async Task CheckAndAward_BytePosted_FirstByte_NotAwardedWithMultipleBytes()
    {
        SeedBadge("first_byte", "First Byte");

        // Seed two bytes
        _db.Bytes.AddRange(
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _userId, Title = "B1", Body = "b", Type = "article", IsActive = true },
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _userId, Title = "B2", Body = "b", Type = "article", IsActive = true });
        _db.SaveChanges();

        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.BytePosted, default);

        Assert.Empty(awarded);
    }

    // ── BytePosted — streak badges ────────────────────────────────────────────

    [Fact]
    public async Task CheckAndAward_BytePosted_StreakBadge7_AwardedWhenStreak7()
    {
        SeedBadge("byte_streak_7", "7-Day Streak");

        // First byte today → streak = 1
        _db.Bytes.Add(new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _userId,
            Title = "Day1",
            Body = "b",
            Type = "article",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        _db.SaveChanges();

        // The user has streak = 0 in DB.  The ComputeAndUpdateStreakAsync will set it to 1
        // (only 1 byte, recentDates.Count <= 1 → newStreak = 1).
        // So we need the user to already have streak = 6 and add one consecutive byte.

        // Reset user streak to 6 and add a byte from yesterday
        var user = await _db.Users.FindAsync([_userId]);
        user!.Streak = 6;
        _db.Bytes.Add(new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _userId,
            Title = "Yesterday",
            Body = "b",
            Type = "article",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        });
        await _db.SaveChangesAsync();

        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.BytePosted, default);

        var names = awarded.Select(b => b.Name).ToList();
        Assert.Contains("byte_streak_7", names);
    }

    // ── ReactionReceived — no badge unless 100 reactions ─────────────────────

    [Fact]
    public async Task CheckAndAward_ReactionReceived_NoBadgeUnder100Likes()
    {
        SeedBadge("reactions_100", "100 Reactions");

        // Fewer than 100 likes
        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.ReactionReceived, default);

        Assert.Empty(awarded);
    }

    // ── FollowReceived — no badge unless 100 followers ────────────────────────

    [Fact]
    public async Task CheckAndAward_FollowReceived_NoBadgeUnder100Followers()
    {
        SeedBadge("followers_100", "100 Followers");

        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.FollowReceived, default);

        Assert.Empty(awarded);
    }

    // ── Wrong trigger — badge condition not met ───────────────────────────────

    [Fact]
    public async Task CheckAndAward_WrongTrigger_NoBadgeAwarded()
    {
        SeedBadge("first_byte", "First Byte");
        // first_byte only triggers on BytePosted, not on ReactionReceived

        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.ReactionReceived, default);

        Assert.Empty(awarded);
    }

    // ── No badges seeded ─────────────────────────────────────────────────────

    [Fact]
    public async Task CheckAndAward_NoBadgesSeeeded_ReturnsEmpty()
    {
        var awarded = await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.BytePosted, default);
        Assert.Empty(awarded);
    }

    // ── Streak computation ─────────────────────────────────────────────────────

    [Fact]
    public async Task Streak_ConsecutiveDays_Increments()
    {
        var user = await _db.Users.FindAsync([_userId]);
        user!.Streak = 3;

        _db.Bytes.AddRange(
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _userId, Title = "Today", Body = "b", Type = "article", IsActive = true, CreatedAt = DateTime.UtcNow },
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _userId, Title = "Yesterday", Body = "b", Type = "article", IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-1) });
        await _db.SaveChangesAsync();

        await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.BytePosted, default);

        var updated = await _db.Users.FindAsync([_userId]);
        Assert.Equal(4, updated!.Streak); // 3 + 1
    }

    [Fact]
    public async Task Streak_GapGreaterThanOneDay_ResetsToOne()
    {
        var user = await _db.Users.FindAsync([_userId]);
        user!.Streak = 5;

        _db.Bytes.AddRange(
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _userId, Title = "Today", Body = "b", Type = "article", IsActive = true, CreatedAt = DateTime.UtcNow },
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _userId, Title = "5DaysAgo", Body = "b", Type = "article", IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-5) });
        await _db.SaveChangesAsync();

        await _sut.CheckAndAwardAsync(_userId, BadgeTrigger.BytePosted, default);

        var updated = await _db.Users.FindAsync([_userId]);
        Assert.Equal(1, updated!.Streak); // reset
    }
}
