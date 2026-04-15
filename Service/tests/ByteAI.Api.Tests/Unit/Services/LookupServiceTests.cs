using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.Lookup;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class LookupServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly LookupService _sut;

    public LookupServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new LookupService(_db);
    }

    public void Dispose() => _db.Dispose();

    // ── SeniorityTypes ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSeniorityTypes_ReturnsSortedByOrder()
    {
        _db.SeniorityTypes.AddRange(
            new SeniorityType { Id = Guid.NewGuid(), Name = "senior", Label = "Senior", Icon = "S", SortOrder = 2 },
            new SeniorityType { Id = Guid.NewGuid(), Name = "junior", Label = "Junior", Icon = "J", SortOrder = 1 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSeniorityTypesAsync(default);

        Assert.Equal(2, result.Count);
        Assert.Equal("junior", result[0].Name);
    }

    [Fact]
    public async Task GetSeniorityTypes_Empty_ReturnsEmpty()
    {
        var result = await _sut.GetSeniorityTypesAsync(default);
        Assert.Empty(result);
    }

    // ── Domains ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDomains_ReturnsSortedByOrder()
    {
        _db.Domains.AddRange(
            new Domain { Id = Guid.NewGuid(), Name = "be", Label = "Backend",  Icon = "B", SortOrder = 2 },
            new Domain { Id = Guid.NewGuid(), Name = "fe", Label = "Frontend", Icon = "F", SortOrder = 1 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetDomainsAsync(default);

        Assert.Equal(2, result.Count);
        Assert.Equal("fe", result[0].Name);
    }

    // ── Subdomains ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSubdomains_WithDomainFilter_ReturnsOnlyMatchingSubdomains()
    {
        var domainId1 = Guid.NewGuid();
        var domainId2 = Guid.NewGuid();
        _db.Domains.AddRange(
            new Domain { Id = domainId1, Name = "d1", Label = "D1", Icon = "d", SortOrder = 1 },
            new Domain { Id = domainId2, Name = "d2", Label = "D2", Icon = "d", SortOrder = 2 });
        _db.SubDomains.AddRange(
            new Subdomain { Id = Guid.NewGuid(), DomainId = domainId1, Name = "apis",  Label = "APIs",  SortOrder = 1 },
            new Subdomain { Id = Guid.NewGuid(), DomainId = domainId2, Name = "react", Label = "React", SortOrder = 1 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSubdomainsAsync(domainId1, default);

        Assert.Single(result);
        Assert.Equal("apis", result[0].Name);
    }

    [Fact]
    public async Task GetSubdomains_NoDomainFilter_ReturnsAll()
    {
        var domainId = Guid.NewGuid();
        _db.Domains.Add(new Domain { Id = domainId, Name = "d", Label = "D", Icon = "d", SortOrder = 1 });
        _db.SubDomains.AddRange(
            new Subdomain { Id = Guid.NewGuid(), DomainId = domainId, Name = "s1", Label = "S1", SortOrder = 1 },
            new Subdomain { Id = Guid.NewGuid(), DomainId = domainId, Name = "s2", Label = "S2", SortOrder = 2 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSubdomainsAsync(null, default);

        Assert.Equal(2, result.Count);
    }

    // ── TechStacks ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTechStacks_WithSubdomainFilter_ReturnsOnlyMatching()
    {
        var domainId     = Guid.NewGuid();
        var subdomainId1 = Guid.NewGuid();
        var subdomainId2 = Guid.NewGuid();
        _db.Domains.Add(new Domain { Id = domainId, Name = "d", Label = "D", Icon = "d", SortOrder = 1 });
        _db.SubDomains.AddRange(
            new Subdomain { Id = subdomainId1, DomainId = domainId, Name = "s1", Label = "S1", SortOrder = 1 },
            new Subdomain { Id = subdomainId2, DomainId = domainId, Name = "s2", Label = "S2", SortOrder = 2 });
        _db.TechStacks.AddRange(
            new TechStack { Id = Guid.NewGuid(), SubdomainId = subdomainId1, Name = "go",   Label = "Go",   SortOrder = 1 },
            new TechStack { Id = Guid.NewGuid(), SubdomainId = subdomainId2, Name = "rust", Label = "Rust", SortOrder = 1 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetTechStacksAsync(subdomainId1, default);

        Assert.Single(result);
        Assert.Equal("go", result[0].Name);
    }

    [Fact]
    public async Task GetTechStacksByDomain_ReturnsAllStacksAcrossSubdomains()
    {
        var domainId     = Guid.NewGuid();
        var subdomainId1 = Guid.NewGuid();
        var subdomainId2 = Guid.NewGuid();
        _db.Domains.Add(new Domain { Id = domainId, Name = "d", Label = "D", Icon = "d", SortOrder = 1 });
        _db.SubDomains.AddRange(
            new Subdomain { Id = subdomainId1, DomainId = domainId, Name = "s1", Label = "S1", SortOrder = 1 },
            new Subdomain { Id = subdomainId2, DomainId = domainId, Name = "s2", Label = "S2", SortOrder = 2 });
        _db.TechStacks.AddRange(
            new TechStack { Id = Guid.NewGuid(), SubdomainId = subdomainId1, Name = "go",     Label = "Go",     SortOrder = 1 },
            new TechStack { Id = Guid.NewGuid(), SubdomainId = subdomainId2, Name = "docker",  Label = "Docker", SortOrder = 1 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetTechStacksByDomainAsync(domainId, default);

        Assert.Equal(2, result.Count);
    }

    // ── Other lookup tables ───────────────────────────────────────────────────

    [Fact]
    public async Task GetBadgeTypes_ReturnsSortedByName()
    {
        _db.BadgeTypes.AddRange(
            new BadgeType { Id = Guid.NewGuid(), Name = "zebra", Label = "Z" },
            new BadgeType { Id = Guid.NewGuid(), Name = "alpha", Label = "A" });
        await _db.SaveChangesAsync();

        var result = await _sut.GetBadgeTypesAsync(default);

        Assert.Equal("alpha", result[0].Name);
    }

    [Fact]
    public async Task GetLevelTypes_ReturnsSortedByLevel()
    {
        _db.LevelTypes.AddRange(
            new LevelType { Id = Guid.NewGuid(), Level = 3, Name = "expert",   Label = "Expert",   XpRequired = 1000 },
            new LevelType { Id = Guid.NewGuid(), Level = 1, Name = "beginner", Label = "Beginner", XpRequired = 0 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetLevelTypesAsync(default);

        Assert.Equal(1, result[0].Level);
    }

    [Fact]
    public async Task GetSearchTypes_ReturnsSortedBySortOrder()
    {
        _db.SearchTypes.AddRange(
            new SearchType { Id = Guid.NewGuid(), Name = "all",   Label = "All",   SortOrder = 2 },
            new SearchType { Id = Guid.NewGuid(), Name = "bytes", Label = "Bytes", SortOrder = 1 });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSearchTypesAsync(default);

        Assert.Equal("bytes", result[0].Name);
    }
}
