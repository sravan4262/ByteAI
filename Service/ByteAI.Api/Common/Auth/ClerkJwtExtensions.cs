using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace ByteAI.Api.Common.Auth;

public static class ClerkJwtExtensions
{
    public static IServiceCollection AddClerkJwt(
        this IServiceCollection services,
        IConfiguration config)
    {
        var authority = config["Clerk:Authority"]
            ?? throw new InvalidOperationException(
                "Clerk:Authority is required. Set it in appsettings.json or the CLERK__AUTHORITY environment variable.");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                // Disable the default claim type mapping so JWT claims arrive as-is.
                // Without this, ASP.NET Core remaps "sub" → ClaimTypes.NameIdentifier,
                // which breaks FindFirst("sub") everywhere in the codebase.
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    NameClaimType = "sub",
                };
            });

        services.AddAuthorization();
        return services;
    }

    /// <summary>Extracts the Clerk user ID from the authenticated user's JWT sub claim.</summary>
    public static string? GetClerkUserId(this HttpContext ctx) =>
        ctx.User.FindFirst("sub")?.Value;
}
