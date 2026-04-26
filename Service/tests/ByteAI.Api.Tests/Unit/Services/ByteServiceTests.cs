using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Exceptions;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Bytes;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Services;

/// <summary>
/// ByteService unit tests using InMemory DB + Mocks.
///
/// Content validation paths:
///   Stage 1 — entropy/gibberish check (pure C#, no mocks needed)
///   Stage 2 — TechDomainAnchors similarity check:
///     - AlwaysReject()  → max similarity = 0 (< 0.15) → InvalidContentException thrown here
///     - AlwaysPass()    → max similarity = 1 (>= 0.15) → falls through to Stage 3
///   Stage 3 — Gemini classification (mocked ILlmService)
///
/// Dedup check (CosineDistance, pgvector-only):
///   Bypassed in all happy-path tests via force=true.
/// </summary>
public sealed class ByteServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IPublisher> _publisher = new();
    private readonly Mock<IEmbeddingService> _embedding = new();
    private readonly Mock<ILlmService> _llm = new();
    private readonly ByteService _sut;

    private readonly Guid _authorId = Guid.NewGuid();

    public ByteServiceTests()
    {
        _db = DbContextFactory.Create();

        // Default: embedding returns zero vector
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new float[768]);

        // Default: LLM returns tech-related + coherent
        _llm.Setup(g => g.ValidateTechContentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new ContentValidationResult(true, true, "ok"));

        // Publisher does nothing (must match the generic Publish<TNotification> overload MediatR uses)
        _publisher.Setup(p => p.Publish(It.IsAny<ByteCreatedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        _sut = BuildSut(TechAnchorsTestHelper.AlwaysPass()); // default: pass Stage 2
    }

    public void Dispose() => _db.Dispose();

    private ByteService BuildSut(ByteAI.Core.Services.AI.TechDomainAnchors anchors) =>
        new(_db, _publisher.Object, _embedding.Object, anchors, _llm.Object, NullLogger<ByteService>.Instance);

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

    // ── Stage 1: Gibberish detection ──────────────────────────────────────────

    [Theory]
    [InlineData("ab", "cd")]                    // too short (< 15 chars combined)
    [InlineData("aaa", "aaaaaaaaaaaaaaaaaa")]   // low entropy (all same char)
    [InlineData("1234567890!@#$%", "!@#$%^&*()")] // high non-alpha ratio
    public async Task CreateByte_GibberishContent_ThrowsInvalidContentException(string title, string body)
    {
        var sut = BuildSut(TechAnchorsTestHelper.AlwaysPass());

        await Assert.ThrowsAsync<InvalidContentException>(
            () => sut.CreateByteAsync(_authorId, title, body, null, null, "article", default, true));
    }

    [Fact]
    public async Task CreateByte_ShortButValid_IsNotFlaggedAsGibberish()
    {
        // "Using Docker" + "container tips" is real English text — passes Stage 1
        SeedAuthor();
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

        var result = await _sut.CreateByteAsync(
            _authorId, "Using Docker", "Container tips and tricks for developers", null, null, "article", default, force: true);

        Assert.Equal("Using Docker", result.Title);
    }

    // ── Stage 2: Tech relevance check ─────────────────────────────────────────

    [Fact]
    public async Task CreateByte_LowTechSimilarity_ThrowsInvalidContentException()
    {
        // AlwaysReject() → MaxSimilarity = 0 < 0.15
        var sut = BuildSut(TechAnchorsTestHelper.AlwaysReject());

        await Assert.ThrowsAsync<InvalidContentException>(
            () => sut.CreateByteAsync(_authorId, "My cat is fluffy today", "Nothing about tech at all", null, null, "article", default, true));
    }

    // ── Stage 3: LLM validation ───────────────────────────────────────────────

    [Fact]
    public async Task CreateByte_LlmSaysNotTechRelated_ThrowsInvalidContentException()
    {
        _llm.Setup(g => g.ValidateTechContentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new ContentValidationResult(false, true, "Not tech content"));
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

        await Assert.ThrowsAsync<InvalidContentException>(
            () => _sut.CreateByteAsync(_authorId, "My cat is fluffy", "I love my cat very much", null, null, "article", default, true));
    }

    [Fact]
    public async Task CreateByte_LlmSaysNotCoherent_ThrowsInvalidContentException()
    {
        _llm.Setup(g => g.ValidateTechContentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new ContentValidationResult(true, false, "Incoherent content"));
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

        await Assert.ThrowsAsync<InvalidContentException>(
            () => _sut.CreateByteAsync(_authorId, "asdfg hjklzxc", "Qwerty uiop asdf ghjkl", null, null, "article", default, true));
    }

    [Fact]
    public async Task CreateByte_LlmReturnsNull_FailsOpenAndPersists()
    {
        // LLM unavailable → null → fail open (Stages 1 & 2 already passed, so don't block on a
        // transient AI failure during create). Update path is fail-closed; create is intentionally not.
        SeedAuthor();
        _llm.Setup(g => g.ValidateTechContentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync((ContentValidationResult?)null);
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

        var result = await _sut.CreateByteAsync(_authorId, "Docker containers explained", "A guide to Docker networking", null, null, "article", default, true);

        Assert.NotNull(result);
        Assert.Equal(_authorId, result.AuthorId);
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateByte_ValidContent_PersistsAndPublishesEvent()
    {
        SeedAuthor();
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

        var result = await _sut.CreateByteAsync(
            _authorId,
            "Docker Networking Guide",
            "A comprehensive guide to Docker bridge, overlay, and host networks.",
            "# example code",
            "bash",
            "tutorial",
            default,
            force: true); // skip dedup (pgvector not available in InMemory)

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("Docker Networking Guide", result.Title);
        Assert.Equal("tutorial", result.Type);
        Assert.Equal(_authorId, result.AuthorId);

        var saved = await _db.Bytes.FindAsync([result.Id]);
        Assert.NotNull(saved);
        Assert.True(saved.IsActive);

        _publisher.Verify(p => p.Publish(It.IsAny<ByteCreatedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateByte_TypeByte_NormalisesToArticle()
    {
        SeedAuthor();
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

        var result = await _sut.CreateByteAsync(
            _authorId, "Docker Tips", "Essential tips for Docker developers everywhere.",
            null, null, "byte", default, force: true);

        Assert.Equal("article", result.Type);
    }

    [Fact]
    public async Task CreateByte_InvalidType_DefaultsToArticle()
    {
        SeedAuthor();
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

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
    public async Task UpdateByte_ContentUnchanged_SkipsValidation()
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

        // Only changing code snippet / language — no title/body change → no validation
        var result = await _sut.UpdateByteAsync(entity.Id, _authorId, null, null, "new code snippet", "python", default);

        Assert.Equal("Original Title", result.Title);
        Assert.Equal("new code snippet", result.CodeSnippet);
        _llm.Verify(g => g.ValidateTechContentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateByte_TitleChanged_RunsValidationAndUpdates()
    {
        SeedAuthor();
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(TechAnchorsTestHelper.UnitVector);

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
        _llm.Verify(g => g.ValidateTechContentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
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

        Assert.Equal(1, result.Total); // only the active one
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

    // ── UpdateEmbeddingAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task UpdateEmbedding_KnownByte_StoresEmbedding()
    {
        SeedAuthor();
        var byteId = Guid.NewGuid();
        _db.Bytes.Add(new ByteEntity { Id = byteId, AuthorId = _authorId, Title = "X", Body = "Y", Type = "article" });
        await _db.SaveChangesAsync();

        var vec = new float[768];
        vec[0] = 0.5f;
        await _sut.UpdateEmbeddingAsync(byteId, vec, default);

        var found = await _db.Bytes.FindAsync([byteId]);
        Assert.NotNull(found?.Embedding);
    }

    [Fact]
    public async Task UpdateEmbedding_UnknownByte_DoesNotThrow()
    {
        // Should silently return when byte not found
        await _sut.UpdateEmbeddingAsync(Guid.NewGuid(), new float[768], default);
    }
}
