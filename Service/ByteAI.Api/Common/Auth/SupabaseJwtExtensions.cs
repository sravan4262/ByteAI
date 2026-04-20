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

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // MetadataAddress enables automatic JWKS discovery + refresh.
                options.MetadataAddress = metadataAddress;
                options.RequireHttpsMetadata = false;
                options.MapInboundClaims = false;
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
