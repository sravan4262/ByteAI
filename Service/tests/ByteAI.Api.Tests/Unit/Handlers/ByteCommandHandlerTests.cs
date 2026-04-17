using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using MediatR;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Handlers;

public sealed class ByteCommandHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IPublisher> _publisher = new();

    private readonly Guid _authorId = Guid.NewGuid();
    private readonly Guid _byteId   = Guid.NewGuid();

    public ByteCommandHandlerTests()
    {
        _db = DbContextFactory.Create();

        _publisher.Setup(p => p.Publish(It.IsAny<ByteCreatedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        _db.Users.Add(new User { Id = _authorId, SupabaseUserId = "a1", Username = "author", DisplayName = "Author" });
        _db.Bytes.Add(new ByteEntity
        {
            Id = _byteId, AuthorId = _authorId,
            Title = "Original Title", Body = "Original body", Type = "article", IsActive = true
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── CreateByteCommandHandler ──────────────────────────────────────────────

    [Fact]
    public async Task CreateByte_PersistsEntityAndPublishesEvent()
    {
        var handler = new CreateByteCommandHandler(_db, _publisher.Object);
        var cmd = new CreateByteCommand(_authorId, "New Title", "New body", null, null, "article");

        var result = await handler.Handle(cmd, default);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("New Title", result.Title);
        Assert.NotNull(await _db.Bytes.FindAsync([result.Id]));
        _publisher.Verify(p => p.Publish(It.IsAny<ByteCreatedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── UpdateByteCommandHandler ──────────────────────────────────────────────

    [Fact]
    public async Task UpdateByte_ValidAuthor_UpdatesFields()
    {
        var handler = new UpdateByteCommandHandler(_db);
        var cmd = new UpdateByteCommand(_byteId, _authorId, "Updated Title", "Updated body", null, null);

        var result = await handler.Handle(cmd, default);

        Assert.Equal("Updated Title", result.Title);
        Assert.Equal("Updated body", result.Body);
    }

    [Fact]
    public async Task UpdateByte_NotFound_ThrowsKeyNotFound()
    {
        var handler = new UpdateByteCommandHandler(_db);
        var cmd = new UpdateByteCommand(Guid.NewGuid(), _authorId, "X", null, null, null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => handler.Handle(cmd, default));
    }

    [Fact]
    public async Task UpdateByte_DifferentAuthor_ThrowsUnauthorized()
    {
        var handler = new UpdateByteCommandHandler(_db);
        var cmd = new UpdateByteCommand(_byteId, Guid.NewGuid(), "X", null, null, null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(cmd, default));
    }

    [Fact]
    public async Task UpdateByte_NullTitle_PreservesExistingTitle()
    {
        var handler = new UpdateByteCommandHandler(_db);
        var cmd = new UpdateByteCommand(_byteId, _authorId, null, null, "new code", "go");

        var result = await handler.Handle(cmd, default);

        Assert.Equal("Original Title", result.Title);
        Assert.Equal("new code", result.CodeSnippet);
    }

    // ── DeleteByteCommandHandler ──────────────────────────────────────────────

    [Fact]
    public async Task DeleteByte_OwnByte_SoftDeletesAndReturnsTrue()
    {
        var handler = new DeleteByteCommandHandler(_db);
        var cmd = new DeleteByteCommand(_byteId, _authorId);

        var result = await handler.Handle(cmd, default);

        Assert.True(result);
        Assert.False((await _db.Bytes.FindAsync([_byteId]))!.IsActive);
    }

    [Fact]
    public async Task DeleteByte_NotFound_ReturnsFalse()
    {
        var handler = new DeleteByteCommandHandler(_db);
        var result  = await handler.Handle(new DeleteByteCommand(Guid.NewGuid(), _authorId), default);

        Assert.False(result);
    }

    [Fact]
    public async Task DeleteByte_DifferentAuthor_ThrowsUnauthorized()
    {
        var handler = new DeleteByteCommandHandler(_db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => handler.Handle(new DeleteByteCommand(_byteId, Guid.NewGuid()), default));
    }

    // ── GetByteByIdQueryHandler ───────────────────────────────────────────────

    [Fact]
    public async Task GetByteById_Existing_ReturnsResult()
    {
        var handler = new GetByteByIdQueryHandler(_db);
        var result  = await handler.Handle(new GetByteByIdQuery(_byteId), default);

        Assert.NotNull(result);
        Assert.Equal("Original Title", result.Title);
    }

    [Fact]
    public async Task GetByteById_NotFound_ReturnsNull()
    {
        var handler = new GetByteByIdQueryHandler(_db);
        var result  = await handler.Handle(new GetByteByIdQuery(Guid.NewGuid()), default);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByteById_Inactive_ReturnsNull()
    {
        _db.Bytes.First(b => b.Id == _byteId).IsActive = false;
        await _db.SaveChangesAsync();

        var handler = new GetByteByIdQueryHandler(_db);
        var result  = await handler.Handle(new GetByteByIdQuery(_byteId), default);

        Assert.Null(result);
    }

    // ── GetBytesQueryHandler ──────────────────────────────────────────────────

    [Fact]
    public async Task GetBytes_ReturnsOnlyActive()
    {
        _db.Bytes.Add(new ByteEntity { AuthorId = _authorId, Title = "Inactive", Body = "b", Type = "article", IsActive = false });
        await _db.SaveChangesAsync();

        var handler = new GetBytesQueryHandler(_db);
        var result  = await handler.Handle(new GetBytesQuery(new PaginationParams(1, 20), null, "latest"), default);

        Assert.Equal(1, result.Total);
    }

    [Fact]
    public async Task GetBytes_FilterByAuthor_ReturnsOnlyThatAuthorsBytes()
    {
        var otherId = Guid.NewGuid();
        _db.Users.Add(new User { Id = otherId, SupabaseUserId = "o1", Username = "other", DisplayName = "O" });
        _db.Bytes.Add(new ByteEntity { AuthorId = otherId, Title = "Other", Body = "b", Type = "article", IsActive = true });
        await _db.SaveChangesAsync();

        var handler = new GetBytesQueryHandler(_db);
        var result  = await handler.Handle(new GetBytesQuery(new PaginationParams(1, 20), _authorId, "latest"), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("Original Title", result.Items[0].Title);
    }

    // ── GetMyBytesQueryHandler ────────────────────────────────────────────────

    [Fact]
    public async Task GetMyBytes_ReturnsOnlyThisAuthorsBytes()
    {
        var otherId = Guid.NewGuid();
        _db.Users.Add(new User { Id = otherId, SupabaseUserId = "o2", Username = "other2", DisplayName = "O2" });
        _db.Bytes.Add(new ByteEntity { AuthorId = otherId, Title = "Not mine", Body = "b", Type = "article", IsActive = true });
        await _db.SaveChangesAsync();

        var handler = new GetMyBytesQueryHandler(_db);
        var result  = await handler.Handle(new GetMyBytesQuery(_authorId, new PaginationParams(1, 20)), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("Original Title", result.Items[0].Title);
    }
}
