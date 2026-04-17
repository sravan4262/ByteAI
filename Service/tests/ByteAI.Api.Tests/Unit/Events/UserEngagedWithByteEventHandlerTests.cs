using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Pgvector;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Events;

/// <summary>
/// UserEngagedWithByteEventHandler updates User.InterestEmbedding via EMA.
/// It resolves AppDbContext from IServiceScopeFactory, so we supply a scope
/// that returns a fresh InMemory DB with seeded data.
/// </summary>
public sealed class UserEngagedWithByteEventHandlerTests
{
    private static (AppDbContext db, IServiceScopeFactory factory) BuildScope()
    {
        var db      = DbContextFactory.Create();
        var scope   = new Mock<IServiceScope>();
        var factory = new Mock<IServiceScopeFactory>();

        var provider = new Mock<IServiceProvider>();
        provider.Setup(p => p.GetService(typeof(AppDbContext))).Returns(db);

        scope.Setup(s => s.ServiceProvider).Returns(provider.Object);
        factory.Setup(f => f.CreateScope()).Returns(scope.Object);

        return (db, factory.Object);
    }

    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _byteId = Guid.NewGuid();

    // ── Handle — byte with embedding ──────────────────────────────────────────

    [Fact]
    public async Task Handle_ByteWithEmbedding_UserNoInterestEmbedding_SetsEmbedding()
    {
        var (db, factory) = BuildScope();
        var handler = new UserEngagedWithByteEventHandler(factory, NullLogger<UserEngagedWithByteEventHandler>.Instance);

        var vec = new float[768]; vec[0] = 1f;
        db.Users.Add(new User { Id = _userId, SupabaseUserId = "c1", Username = "u", DisplayName = "U" });
        db.Bytes.Add(new ByteEntity
        {
            Id = _byteId, AuthorId = _userId, Title = "T", Body = "b", Type = "article",
            Embedding = new Vector(vec)
        });
        await db.SaveChangesAsync();

        await handler.Handle(new UserEngagedWithByteEvent(_userId, _byteId), default);

        var user = await db.Users.FindAsync([_userId]);
        Assert.NotNull(user!.InterestEmbedding);
    }

    [Fact]
    public async Task Handle_ByteWithEmbedding_UserHasInterestEmbedding_BlendsThem()
    {
        var (db, factory) = BuildScope();
        var handler = new UserEngagedWithByteEventHandler(factory, NullLogger<UserEngagedWithByteEventHandler>.Instance);

        var existing = new float[768]; existing[0] = 1f;
        var content  = new float[768]; content[1]  = 1f;

        db.Users.Add(new User
        {
            Id = _userId, SupabaseUserId = "c2", Username = "u2", DisplayName = "U2",
            InterestEmbedding = new Vector(existing)
        });
        db.Bytes.Add(new ByteEntity
        {
            Id = _byteId, AuthorId = _userId, Title = "T", Body = "b", Type = "article",
            Embedding = new Vector(content)
        });
        await db.SaveChangesAsync();

        await handler.Handle(new UserEngagedWithByteEvent(_userId, _byteId), default);

        var user = await db.Users.FindAsync([_userId]);
        Assert.NotNull(user!.InterestEmbedding);
        // After EMA blend both dim[0] and dim[1] should be non-zero
        var arr = user.InterestEmbedding.ToArray();
        Assert.True(arr[0] > 0);
        Assert.True(arr[1] > 0);
    }

    // ── Handle — byte without embedding (no-op) ───────────────────────────────

    [Fact]
    public async Task Handle_ByteWithNoEmbedding_DoesNotUpdate()
    {
        var (db, factory) = BuildScope();
        var handler = new UserEngagedWithByteEventHandler(factory, NullLogger<UserEngagedWithByteEventHandler>.Instance);

        db.Users.Add(new User { Id = _userId, SupabaseUserId = "c3", Username = "u3", DisplayName = "U3" });
        db.Bytes.Add(new ByteEntity
        {
            Id = _byteId, AuthorId = _userId, Title = "T", Body = "b", Type = "article",
            Embedding = null
        });
        await db.SaveChangesAsync();

        await handler.Handle(new UserEngagedWithByteEvent(_userId, _byteId), default);

        var user = await db.Users.FindAsync([_userId]);
        Assert.Null(user!.InterestEmbedding);
    }

    // ── Handle — unknown byte ─────────────────────────────────────────────────

    [Fact]
    public async Task Handle_UnknownByte_DoesNotThrow()
    {
        var (db, factory) = BuildScope();
        var handler = new UserEngagedWithByteEventHandler(factory, NullLogger<UserEngagedWithByteEventHandler>.Instance);

        db.Users.Add(new User { Id = _userId, SupabaseUserId = "c4", Username = "u4", DisplayName = "U4" });
        await db.SaveChangesAsync();

        // Should swallow silently — no byte exists
        await handler.Handle(new UserEngagedWithByteEvent(_userId, Guid.NewGuid()), default);
    }

    // ── Handle — unknown user ─────────────────────────────────────────────────

    [Fact]
    public async Task Handle_UnknownUser_DoesNotThrow()
    {
        var (db, factory) = BuildScope();
        var handler = new UserEngagedWithByteEventHandler(factory, NullLogger<UserEngagedWithByteEventHandler>.Instance);

        var vec = new float[768]; vec[0] = 1f;
        db.Bytes.Add(new ByteEntity
        {
            Id = _byteId, AuthorId = Guid.NewGuid(), Title = "T", Body = "b", Type = "article",
            Embedding = new Vector(vec)
        });
        await db.SaveChangesAsync();

        await handler.Handle(new UserEngagedWithByteEvent(Guid.NewGuid(), _byteId), default);
    }
}
