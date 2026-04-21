using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace ByteAI.Api.Common.Auth;

public static class SupabaseJwtExtensions
{
    public static IServiceCollection AddSupabaseJwt(
        this IServiceCollection services,
        IConfiguration config)
    {
        var supabaseUrl = config["Supabase:Url"];
        if (string.IsNullOrWhiteSpace(supabaseUrl))
            throw new InvalidOperationException(
                "Supabase:Url is required. Set the SUPABASE__URL environment variable.");

        var jwtSecret = config["Supabase:JwtSecret"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
            throw new InvalidOperationException(
                "Supabase:JwtSecret is required. Set the SUPABASE__JWTSECRET environment variable. " +
                "Find it in Supabase Dashboard → Project Settings → API → JWT Settings.");

        // Allow overriding the issuer separately from the URL used for HTTP calls.
        // Needed for local Docker where the JWT iss is 127.0.0.1 but the API reaches
        // Supabase via host.docker.internal.
        var jwtIssuerBase = config["Supabase:JwtIssuer"] ?? supabaseUrl;
        var issuer = $"{jwtIssuerBase.TrimEnd('/')}/auth/v1";

        // HS256 fallback key (legacy / local Supabase).
        // ES256/RS256 keys are fetched dynamically via JWKS discovery so they
        // survive key rotation without a redeploy.
        var hs256Key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var metadataAddress = $"{supabaseUrl.TrimEnd('/')}/auth/v1/.well-known/openid-configuration";

        // Inside Docker, OIDC discovery returns 127.0.0.1 URIs (the public URL),
        // but 127.0.0.1 inside a container is the container loopback, not the host.
        // If PublicUrl differs from Url, rewrite backchannel requests so JWKS fetches
        // are redirected to the internal host address (host.docker.internal).
        var publicUrl = config["Supabase:PublicUrl"];
        HttpClientHandler? backchannelHandler = null;
        if (!string.IsNullOrWhiteSpace(publicUrl) &&
            !publicUrl.TrimEnd('/').Equals(supabaseUrl?.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))
        {
            backchannelHandler = new UrlRewritingHandler(publicUrl.TrimEnd('/'), supabaseUrl!.TrimEnd('/'));
        }

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // MetadataAddress enables automatic JWKS discovery + refresh.
                options.MetadataAddress = metadataAddress;
                options.RequireHttpsMetadata = false;
                options.MapInboundClaims = false;
                if (backchannelHandler is not null)
                    options.BackchannelHttpHandler = backchannelHandler;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    // HS256 fallback — middleware merges these with JWKS keys automatically.
                    IssuerSigningKeys = [hs256Key],
                    NameClaimType = "sub",
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        services.AddAuthorization();
        return services;
    }

    /// <summary>Extracts the Supabase user ID (auth.users.id) from the JWT sub claim.</summary>
    public static string? GetSupabaseUserId(this HttpContext ctx) =>
        ctx.User.FindFirst("sub")?.Value;
}

/// <summary>
/// Rewrites backchannel HTTP requests from one base URL to another.
/// Used so JWKS fetches work inside Docker where the OIDC discovery doc
/// returns 127.0.0.1 URIs that are unreachable from within a container.
/// </summary>
file sealed class UrlRewritingHandler(string from, string to) : HttpClientHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var uri = request.RequestUri?.ToString();
        if (uri is not null && uri.StartsWith(from, StringComparison.OrdinalIgnoreCase))
            request.RequestUri = new Uri(to + uri[from.Length..]);
        return base.SendAsync(request, ct);
    }
}
