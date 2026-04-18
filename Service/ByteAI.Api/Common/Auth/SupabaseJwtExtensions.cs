using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
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

        // Build signing keys: HS256 (cloud Supabase / legacy) + ES256/RS256 from JWKS
        // (new Supabase CLI v2.84+ signs with EC keys).
        var signingKeys = BuildSigningKeys(supabaseUrl, jwtSecret);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys,
                    // Return all keys so kid mismatches don't block validation.
                    IssuerSigningKeyResolver = (_, _, _, _) => signingKeys,
                    NameClaimType = "sub",
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        services.AddAuthorization();
        return services;
    }

    private static IList<SecurityKey> BuildSigningKeys(string supabaseUrl, string jwtSecret)
    {
        var keys = new List<SecurityKey>
        {
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };

        try
        {
            var jwksUrl = $"{supabaseUrl.TrimEnd('/')}/auth/v1/.well-known/jwks.json";
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            var json = http.GetStringAsync(jwksUrl).GetAwaiter().GetResult();
            var jwks = new JsonWebKeySet(json);
            keys.AddRange(jwks.Keys);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Auth] JWKS fetch skipped ({ex.Message}). HS256 key only.");
        }

        return keys;
    }

    /// <summary>Extracts the Supabase user ID (auth.users.id) from the JWT sub claim.</summary>
    public static string? GetSupabaseUserId(this HttpContext ctx) =>
        ctx.User.FindFirst("sub")?.Value;
}
