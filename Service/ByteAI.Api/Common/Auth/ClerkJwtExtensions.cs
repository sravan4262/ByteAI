using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace ByteAI.Api.Common.Auth;

public static class ClerkJwtExtensions
{
    public static IServiceCollection AddClerkJwt(
        this IServiceCollection services,
        IConfiguration config,
        IWebHostEnvironment env)
    {
        var isDev = env.IsDevelopment();

        // In development, Clerk:Authority is optional so the app starts without real Clerk config.
        var authority = config["Clerk:Authority"];
        if (!isDev && string.IsNullOrEmpty(authority))
            throw new InvalidOperationException("Clerk:Authority is required in non-development environments");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = !isDev,
                    ValidateAudience = false,
                    ValidateLifetime = !isDev,
                    ValidateIssuerSigningKey = !isDev,
                    NameClaimType = "sub",
                };

                // Development bypass — accept any well-formed JWT without signature check.
                // Create a test token at https://jwt.io with payload: { "sub": "your-test-user-id" }
                if (isDev)
                {
                    options.TokenValidationParameters.SignatureValidator =
                        (token, _) => new JwtSecurityTokenHandler().ReadJwtToken(token);
                }
            });

        services.AddAuthorization();
        return services;
    }

    /// <summary>Extracts the Clerk userId (sub claim) from the current HTTP context.</summary>
    public static string? GetClerkUserId(this HttpContext ctx) =>
        ctx.User.FindFirst("sub")?.Value;
}
