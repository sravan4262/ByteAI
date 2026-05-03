using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Moderation;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Bytes;
using ByteAI.Core.Services.Mentions;
using MediatR;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Services;

/// <summary>
/// ByteService unit tests. Content validation is now a single call to
/// IModerationService.ModerateAsync (composite Layer 1 + Gemini); we mock that
/// service directly. Failure mode is owned by CompositeModerator, not ByteService,
/// so tests here cover only "moderation passes" vs "moderation throws".
/// </summary>
public sealed class ByteServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IPublisher> _publisher = new();
    private readonly Mock<IEmbeddingService> _embedding = new();
    private readonly Mock<IModerationService> _moderation = new();
    private readonly Mock<IMentionNotifier> _mentionNotifier = new();
    private readonly ByteService _sut;

    private readonly Guid _authorId = Guid.NewGuid();

    public ByteServiceTests()
    {
        _db = DbContextFactory.Create();

        // Default: embedding returns zero vector — sufficient for happy paths since dedup
        // is bypassed via force=true. pgvector-backed dedup is exercised in integration tests.
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new float[768]);

        // Default: moderation passes.
        _moderation.Setup(m => m.ModerateAsync(It.IsAny<string>(), It.IsAny<ModerationContext>(), It.IsAny<CancellationToken>()))
                   .ReturnsAsync(ModerationResult.Clean);

        _publisher.Setup(p => p.Publish(It.IsAny<ByteCreatedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        _mentionNotifier.Setup(m => m.NotifyAsync(
                It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<MentionContext>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _sut = new ByteService(_db, _publisher.Object, _embedding.Object, _moderation.Object, _mentionNotifier.Object);
    }

    public void Dispose() => _db.Dispose();

    private void SeedAuthor()
    {
        if (_db.Users.Find(_authorId) is not null) return;
        _db.Users.Add(new User
        {
            Id = _authorId,
            SupabaseUserId = "supabase_byte",
            Username = "byteauthor",
            DisplayName = "Byte Author"
        });
        _db.SaveChanges();
    }

    private void SetupModerationReject(params (string Code, string Message)[] reasons)
    {
        var rs = reasons.Select(r => new ModerationReason(r.Code, r.Message)).ToList();
        var result = new ModerationResult(IsClean: false, ModerationSeverity.High, rs);
        _moderation.Setup(m => m.ModerateAsync(It.IsAny<string>(), It.IsAny<ModerationContext>(), It.IsAny<CancellationToken>()))
                   .ReturnsAsync(result);
    }

    // ── Moderation rejects → ContentModerationException ───────────────────────

    [Fact]
    public async Task CreateByte_ModerationRejectsOffTopic_ThrowsContentModerationException()
    {
        SeedAuthor();
        SetupModerationReject(("OFF_TOPIC", "Make the post substantively about a tech topic, not just mention one."));

        var ex = await Assert.ThrowsAsync<ContentModerationException>(
            () => _sut.CreateByteAsync(_authorId, "About Detroit city", "Very bad and not recommended but developers like it",
                                        null, null, "article", default, force: true));

        Assert.Equal(ModerationSeverity.High, ex.Severity);
        Assert.Single(ex.Reasons);
        Assert.Equal("OFF_TOPIC", ex.Reasons[0].Code);
    }

    [Fact]
    public async Task CreateByte_ModerationRejectsGibberish_ThrowsContentModerationException()
    {
        SeedAuthor();
        SetupModerationReject(("GIBBERISH", "Write a clear sentence about a tech topic."));

        await Assert.ThrowsAsync<ContentModerationException>(
            () => _sut.CreateByteAsync(_authorId, "asdfg hjklzxc", "Qwerty uiop asdf ghjkl",
                                        null, null, "article", default, force: true));
    }

    [Fact]
    public async Task CreateByte_ModerationRejectsMultipleReasons_AllReturnedToCaller()
    {
        SeedAuthor();
        SetupModerationReject(
            ("PROFANITY", "Remove the profanity and rephrase."),
            ("OFF_TOPIC", "Make the post substantively about a tech topic."));

        var ex = await Assert.ThrowsAsync<ContentModerationException>(
            () => _sut.CreateByteAsync(_authorId, "title", "body", null, null, "article", default, force: true));

        Assert.Equal(2, ex.Reasons.Count);
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateByte_ModerationPasses_PersistsAndPublishesEvent()
    {
        SeedAuthor();

        var result = await _sut.CreateByteAsync(
            _authorId,
            "Docker Networking Guide",
            "A comprehensive guide to Docker bridge, overlay, and host networks.",
            "# example code",
            "bash",
            "tutorial",
            default,
            force: true);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("Docker Networking Guide", result.Title);
        Assert.Equal("tutorial", result.Type);
        Assert.Equal(_authorId, result.AuthorId);

        var saved = await _db.Bytes.FindAsync([result.Id]);
        Assert.NotNull(saved);
        Assert.True(saved.IsActive);

        _publisher.Verify(p => p.Publish(It.IsAny<ByteCreatedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
        _moderation.Verify(m => m.ModerateAsync(It.IsAny<string>(), ModerationContext.Byte, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateByte_TypeByte_NormalisesToArticle()
    {
        SeedAuthor();

        var result = await _sut.CreateByteAsync(
            _authorId, "Docker Tips", "Essential tips for Docker developers everywhere.",
            null, null, "byte", default, force: true);

        Assert.Equal("article", result.Type);
    }

    [Fact]
    public async Task CreateByte_InvalidType_DefaultsToArticle()
    {
        SeedAuthor();

        var result = await _sut.CreateByteAsync(
            _authorId, "Docker Basics", "Introduction to Docker containers for beginners.",
            null, null, "unknown_type", default, force: true);

        Assert.Equal("article", result.Type);
    }

    // ── UpdateByteAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateByte_NotFound_ThrowsKeyNotFoundException()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.UpdateByteAsync(Guid.NewGuid(), _authorId, "New Title", null, null, null, default));
    }

    [Fact]
    public async Task UpdateByte_DifferentAuthor_ThrowsUnauthorized()
    {
        SeedAuthor();
        var entity = new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _authorId,
            Title = "Original",
            Body = "body",
            Type = "article"
        };
        _db.Bytes.Add(entity);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UpdateByteAsync(entity.Id, Guid.NewGuid(), "New Title", null, null, null, default));
    }

    [Fact]
    public async Task UpdateByte_ContentUnchanged_SkipsModeration()
    {
        SeedAuthor();
        var entity = new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _authorId,
            Title = "Original Title",
            Body = "Original body text",
            Type = "article"
        };
        _db.Bytes.Add(entity);
        await _db.SaveChangesAsync();

        // Only changing code snippet / language — no title/body change → skip moderation
        var result = await _sut.UpdateByteAsync(entity.Id, _authorId, null, null, "new code snippet", "python", default);

        Assert.Equal("Original Title", result.Title);
        Assert.Equal("new code snippet", result.CodeSnippet);
        _moderation.Verify(m => m.ModerateAsync(It.IsAny<string>(), It.IsAny<ModerationContext>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateByte_TitleChanged_RunsModerationAndUpdates()
    {
        SeedAuthor();
        var entity = new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _authorId,
            Title = "Old Title",
            Body = "A detailed guide to Kubernetes deployments for developers.",
            Type = "article"
        };
        _db.Bytes.Add(entity);
        await _db.SaveChangesAsync();

        var result = await _sut.UpdateByteAsync(
            entity.Id, _authorId, "New Kubernetes Title", null, null, null, default);

        Assert.Equal("New Kubernetes Title", result.Title);
        _moderation.Verify(m => m.ModerateAsync(It.IsAny<string>(), ModerationContext.Byte, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateByte_ModerationRejects_ThrowsContentModerationException()
    {
        SeedAuthor();
        SetupModerationReject(("OFF_TOPIC", "Make the post substantively about a tech topic."));

        var entity = new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _authorId,
            Title = "Old Title",
            Body = "An old body about Kubernetes deployments.",
            Type = "article"
        };
        _db.Bytes.Add(entity);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<ContentModerationException>(
            () => _sut.UpdateByteAsync(entity.Id, _authorId, "About my cat", null, null, null, default));
    }

    // ── DeleteByteAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteByte_NotFound_ReturnsFalse()
    {
        var result = await _sut.DeleteByteAsync(Guid.NewGuid(), _authorId, default);
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteByte_DifferentAuthor_ThrowsUnauthorized()
    {
        SeedAuthor();
        var entity = new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _authorId,
            Title = "My Byte",
            Body = "My byte body text content here.",
            Type = "article",
            IsActive = true
        };
        _db.Bytes.Add(entity);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.DeleteByteAsync(entity.Id, Guid.NewGuid(), default));
    }

    [Fact]
    public async Task DeleteByte_OwnByte_SoftDeletesAndReturnsTrue()
    {
        SeedAuthor();
        var entity = new ByteEntity
        {
            Id = Guid.NewGuid(),
            AuthorId = _authorId,
            Title = "My Byte",
            Body = "My byte body text content here.",
            Type = "article",
            IsActive = true
        };
        _db.Bytes.Add(entity);
        await _db.SaveChangesAsync();

        var result = await _sut.DeleteByteAsync(entity.Id, _authorId, default);

        Assert.True(result);
        var found = await _db.Bytes.FindAsync([entity.Id]);
        Assert.NotNull(found);
        Assert.False(found.IsActive); // soft delete
    }

    // ── GetBytesAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetBytes_NoAuthorFilter_ReturnsAllActive()
    {
        SeedAuthor();
        _db.Bytes.AddRange(
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _authorId, Title = "B1", Body = "b", Type = "article", IsActive = true },
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _authorId, Title = "B2", Body = "b", Type = "article", IsActive = false });
        await _db.SaveChangesAsync();

        var result = await _sut.GetBytesAsync(new ByteAI.Core.Infrastructure.PaginationParams(1, 20), null, "latest", default);

        Assert.Equal(1, result.Total);
    }

    // ── GetMyBytesAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetMyBytes_ReturnsOnlyAuthorBytes()
    {
        SeedAuthor();
        var otherId = Guid.NewGuid();

        _db.Bytes.AddRange(
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = _authorId, Title = "Mine", Body = "b", Type = "article", IsActive = true },
            new ByteEntity { Id = Guid.NewGuid(), AuthorId = otherId, Title = "Other", Body = "b", Type = "article", IsActive = true });
        await _db.SaveChangesAsync();

        var result = await _sut.GetMyBytesAsync(_authorId, new ByteAI.Core.Infrastructure.PaginationParams(1, 20), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("Mine", result.Items[0].Title);
    }
}
