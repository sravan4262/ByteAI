using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace ByteAI.Api.Common.Auth;

public static class ClerkJwtExtensions
{
    public static IServiceCollection AddClerkJwt(this IServiceCollection services, IConfiguration config)
    {
        var authority = config["Clerk:Authority"]
            ?? throw new InvalidOperationException("Clerk:Authority is required");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
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

    /// <summary>Extracts the Clerk userId (sub claim) from the current HTTP context.</summary>
    public static string? GetClerkUserId(this HttpContext ctx) =>
        ctx.User.FindFirst("sub")?.Value;
}
