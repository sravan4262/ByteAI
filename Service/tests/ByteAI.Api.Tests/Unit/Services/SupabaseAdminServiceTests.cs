using ByteAI.Core.Services.Supabase;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Net;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class SupabaseAdminServiceTests
{
    private const string FakeUrl = "https://fake.supabase.co";
    private const string FakeKey = "service-role-key-abc";
    private const string UserId  = "550e8400-e29b-41d4-a716-446655440000";

    private static (SupabaseAdminService sut, List<HttpRequestMessage> captured) Build(HttpStatusCode responseStatus)
    {
        var captured = new List<HttpRequestMessage>();

        var handler = new MockHttpMessageHandler(responseStatus, captured);
        var http    = new HttpClient(handler);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Supabase:Url"]            = FakeUrl,
                ["Supabase:ServiceRoleKey"] = FakeKey,
            })
            .Build();

        var sut = new SupabaseAdminService(http, config, NullLogger<SupabaseAdminService>.Instance);
        return (sut, captured);
    }

    [Fact]
    public async Task DeleteAuthUserAsync_CallsCorrectUrl()
    {
        var (sut, captured) = Build(HttpStatusCode.OK);

        await sut.DeleteAuthUserAsync(UserId);

        Assert.Single(captured);
        Assert.Equal($"{FakeUrl}/auth/v1/admin/users/{UserId}", captured[0].RequestUri!.ToString());
        Assert.Equal(HttpMethod.Delete, captured[0].Method);
    }

    [Fact]
    public async Task DeleteAuthUserAsync_SetsAuthorizationHeader()
    {
        var (sut, captured) = Build(HttpStatusCode.OK);

        await sut.DeleteAuthUserAsync(UserId);

        var auth = captured[0].Headers.Authorization;
        Assert.NotNull(auth);
        Assert.Equal("Bearer", auth!.Scheme);
        Assert.Equal(FakeKey, auth.Parameter);
    }

    [Fact]
    public async Task DeleteAuthUserAsync_SetsApiKeyHeader()
    {
        var (sut, captured) = Build(HttpStatusCode.OK);

        await sut.DeleteAuthUserAsync(UserId);

        Assert.True(captured[0].Headers.TryGetValues("apikey", out var values));
        Assert.Equal(FakeKey, values!.Single());
    }

    [Fact]
    public async Task DeleteAuthUserAsync_ThrowsOnNonSuccessResponse()
    {
        var (sut, _) = Build(HttpStatusCode.InternalServerError);

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.DeleteAuthUserAsync(UserId));
    }

    [Fact]
    public async Task DeleteAuthUserAsync_ThrowsOnNotFound()
    {
        var (sut, _) = Build(HttpStatusCode.NotFound);

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.DeleteAuthUserAsync(UserId));
    }

    [Fact]
    public void Constructor_ThrowsWhenSupabaseUrlMissing()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Supabase:ServiceRoleKey"] = FakeKey,
            })
            .Build();

        Assert.Throws<InvalidOperationException>(() =>
            new SupabaseAdminService(new HttpClient(), config, NullLogger<SupabaseAdminService>.Instance));
    }

    [Fact]
    public void Constructor_ThrowsWhenServiceRoleKeyMissing()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Supabase:Url"] = FakeUrl,
            })
            .Build();

        Assert.Throws<InvalidOperationException>(() =>
            new SupabaseAdminService(new HttpClient(), config, NullLogger<SupabaseAdminService>.Instance));
    }

    // Minimal handler that records requests and returns a fixed status code.
    private sealed class MockHttpMessageHandler(HttpStatusCode status, List<HttpRequestMessage> captured)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            captured.Add(request);
            return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent("{}") });
        }
    }
}
