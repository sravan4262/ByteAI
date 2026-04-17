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
        var supabaseUrl = config["Supabase:Url"]
            ?? throw new InvalidOperationException(
                "Supabase:Url is required. Set it in appsettings.json or the SUPABASE__URL environment variable.");

        var jwtSecret = config["Supabase:JwtSecret"]
            ?? throw new InvalidOperationException(
                "Supabase:JwtSecret is required. Find it in Supabase Dashboard → Project Settings → API → JWT Settings.");

        var issuer = $"{supabaseUrl.TrimEnd('/')}/auth/v1";

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Supabase issues HS256 JWTs — symmetric key validation, no OIDC discovery.
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSecret)),
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
