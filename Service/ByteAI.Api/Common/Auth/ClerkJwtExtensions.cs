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

        if (isDev)
        {
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, DevAuthHandler>(JwtBearerDefaults.AuthenticationScheme, _ => { });
        }
        else
        {
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
        }

        services.AddAuthorization();
        return services;
    }

    public static string? GetClerkUserId(this HttpContext ctx) =>
        ctx.User.FindFirst("sub")?.Value;
}

public class DevAuthHandler : Microsoft.AspNetCore.Authentication.AuthenticationHandler<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions>
{
    public DevAuthHandler(Microsoft.Extensions.Options.IOptionsMonitor<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions> o, Microsoft.Extensions.Logging.ILoggerFactory l, System.Text.Encodings.Web.UrlEncoder e) : base(o, l, e) { }
    protected override Task<Microsoft.AspNetCore.Authentication.AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new System.Security.Claims.Claim("sub", "seed_alex") };
        var id = new System.Security.Claims.ClaimsIdentity(claims, "DevBypass");
        var ticket = new Microsoft.AspNetCore.Authentication.AuthenticationTicket(new System.Security.Claims.ClaimsPrincipal(id), "DevBypass");
        return Task.FromResult(Microsoft.AspNetCore.Authentication.AuthenticateResult.Success(ticket));
    }
}
