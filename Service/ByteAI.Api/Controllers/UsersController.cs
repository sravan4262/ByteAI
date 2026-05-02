using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Moderation;
using ByteAI.Core.Services.Avatar;
using ByteAI.Core.Services.Preferences;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Users")]
[RequireRole("user")]
public sealed class UsersController(
    IUsersBusiness usersBusiness,
    IUserPreferencesService prefsService,
    IAvatarService avatarService,
    IModerationService moderation,
    ICurrentUserService currentUserService,
    AppDbContext db) : ControllerBase
{
    /// <summary>Get a user's public profile by ID.</summary>
    [HttpGet("{userId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetUserById(Guid userId, CancellationToken ct)
    {
        var user = await usersBusiness.GetUserByIdAsync(userId, ct);
        if (user is null) return NotFound(new { message = $"User {userId} not found" });
        var (bytesCount, followersCount, followingCount) = await usersBusiness.GetUserStatsAsync(userId, ct);
        bool? isFollowedByMe = null;
        var supabaseUserId = HttpContext.GetSupabaseUserId();
        if (supabaseUserId is not null)
        {
            var me = await usersBusiness.GetCurrentUserAsync(supabaseUserId, ct);
            if (me is not null) isFollowedByMe = await usersBusiness.IsFollowingAsync(me.Id, userId, ct);
        }
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse(bytesCount, followersCount, followingCount, isFollowedByMe)));
    }

    /// <summary>Get a user's public profile by username.</summary>
    [HttpGet("username/{username}")]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetUserByUsername(string username, CancellationToken ct)
    {
        var user = await usersBusiness.GetUserByUsernameAsync(username, ct);
        if (user is null) return NotFound(new { message = $"User '{username}' not found" });
        var (bytesCount, followersCount, followingCount) = await usersBusiness.GetUserStatsAsync(user.Id, ct);
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse(bytesCount, followersCount, followingCount)));
    }

    /// <summary>Get the currently authenticated user's profile.</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetCurrentUser(CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var user = await usersBusiness.GetCurrentUserAsync(supabaseUserId, ct);
        if (user is null) return NotFound(new { message = "User not found" });
        var (bytesCount, followersCount, followingCount) = await usersBusiness.GetUserStatsAsync(user.Id, ct);
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse(bytesCount, followersCount, followingCount)));
    }

    /// <summary>List a user's followers.</summary>
    [HttpGet("{userId:guid}/followers")]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<UserResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<UserResponse>>>> GetFollowers(
        Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await usersBusiness.GetFollowersAsync(userId, page, pageSize, ct);
        var response = new PagedResponse<UserResponse>(result.Items.Select(u => u.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<UserResponse>>.Success(response));
    }

    /// <summary>List the users that a user follows.</summary>
    [HttpGet("{userId:guid}/following")]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<UserResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<UserResponse>>>> GetFollowing(
        Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await usersBusiness.GetFollowingAsync(userId, page, pageSize, ct);
        var response = new PagedResponse<UserResponse>(result.Items.Select(u => u.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<UserResponse>>.Success(response));
    }

    /// <summary>Update the current authenticated user's profile (seniority, domain, tech stack, bio).</summary>
    [HttpPut("me/profile")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> UpdateMyProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var authorId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);

        // ── Username gets strict handling: ANY flag (medium or high) blocks the change.
        //    Handles appear in URLs / @-mentions / notifications and are hard to retract.
        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            var unameResult = await moderation.ModerateAsync(request.Username, ModerationContext.Profile, ct);
            if (!unameResult.IsClean && unameResult.Severity >= ModerationSeverity.Medium)
            {
                try
                {
                    await FlaggedContentWriter.RecordAsync(
                        db, ModerationContext.Profile, authorId, unameResult, ct, authorId, request.Username);
                }
                catch { /* never block on flag-write failure */ }
                throw new ContentModerationException(unameResult);
            }
        }

        // Other fields use the standard medium-leniency flow (high → block, medium → flag + allow).
        var profileText = string.Join("\n",
            new[] { request.DisplayName, request.Bio, request.RoleTitle, request.Company }
                .Where(s => !string.IsNullOrWhiteSpace(s)));
        if (!string.IsNullOrWhiteSpace(profileText))
            await moderation.EnforceAsync(db, profileText, ModerationContext.Profile, contentId: authorId, authorId: authorId, ct: ct);

        try
        {
            var result = await usersBusiness.UpdateMyProfileAsync(
                supabaseUserId, request.Username, request.DisplayName, request.Bio, request.Company, request.RoleTitle, request.Seniority, request.Domain, request.TechStack, request.CustomAvatarUrl, ct);
            return Ok(ApiResponse<UserResponse>.Success(result.ToResponse()));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Update the authenticated user's profile. Users may only update their own profile.</summary>
    [HttpPut("{userId:guid}/profile")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> UpdateProfile(Guid userId, [FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        var profileText = string.Join("\n",
            new[] { request.DisplayName, request.Bio }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (!string.IsNullOrWhiteSpace(profileText))
            await moderation.EnforceAsync(db, profileText, ModerationContext.Profile, contentId: userId, authorId: userId, ct: ct);

        try
        {
            var result = await usersBusiness.UpdateProfileAsync(supabaseUserId, userId, request.DisplayName, request.Bio, ct);
            return Ok(ApiResponse<UserResponse>.Success(result.ToResponse()));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    /// <summary>Get the current user's social links.</summary>
    [HttpGet("me/socials")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<List<SocialResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<SocialResponse>>>> GetMySocials(CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var socials = await usersBusiness.GetMySocialsAsync(supabaseUserId, ct);
        var response = socials.Select(s => new SocialResponse(s.Platform, s.Url, s.Label)).ToList();
        return Ok(ApiResponse<List<SocialResponse>>.Success(response));
    }

    /// <summary>Replace the current user's social links.</summary>
    [HttpPut("me/socials")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpsertMySocials([FromBody] UpsertSocialsRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var socials = request.Socials.Select(s => (s.Platform, s.Url, s.Label)).ToList();
        await usersBusiness.UpsertMySocialsAsync(supabaseUserId, socials, ct);
        return NoContent();
    }

    /// <summary>Get the current user's preferences (theme, visibility, notification toggles).</summary>
    [HttpGet("me/preferences")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserPreferencesResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<UserPreferencesResponse>>> GetMyPreferences(CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var me = await usersBusiness.GetCurrentUserAsync(supabaseUserId, ct);
        if (me is null) return NotFound();
        var prefs = await prefsService.GetOrDefaultAsync(me.Id, ct);
        return Ok(ApiResponse<UserPreferencesResponse>.Success(new UserPreferencesResponse(
            prefs.Theme, prefs.Visibility,
            prefs.NotifReactions, prefs.NotifComments,
            prefs.NotifFollowers, prefs.NotifUnfollows)));
    }

    /// <summary>Update the current user's preferences (partial — only supplied fields are changed).</summary>
    [HttpPut("me/preferences")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserPreferencesResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<UserPreferencesResponse>>> UpdateMyPreferences(
        [FromBody] UpdatePreferencesRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var me = await usersBusiness.GetCurrentUserAsync(supabaseUserId, ct);
        if (me is null) return NotFound();
        var prefs = await prefsService.UpsertAsync(
            me.Id, request.Theme, request.Visibility,
            request.NotifReactions, request.NotifComments,
            request.NotifFollowers, request.NotifUnfollows, ct);
        return Ok(ApiResponse<UserPreferencesResponse>.Success(new UserPreferencesResponse(
            prefs.Theme, prefs.Visibility,
            prefs.NotifReactions, prefs.NotifComments,
            prefs.NotifFollowers, prefs.NotifUnfollows)));
    }

    /// <summary>Upload a profile photo — resized to 256×256 WebP and stored in Supabase Storage.</summary>
    [HttpPost("me/avatar")]
    [Authorize]
    [EnableRateLimiting("write")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<AvatarUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<AvatarUploadResponse>>> UploadMyAvatar(
        IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "File too large. Maximum 10 MB." });

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "File must be an image." });

        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var me = await usersBusiness.GetCurrentUserAsync(supabaseUserId, ct);
        if (me is null) return NotFound(new { message = "User not found" });

        await using var stream = file.OpenReadStream();
        var avatarUrl = await avatarService.UploadAsync(me.Id, stream, file.ContentType, ct);

        // Persist the URL to the users table
        await usersBusiness.UpdateMyProfileAsync(
            supabaseUserId, null, null, null, null, null, null, null, null, avatarUrl, ct);

        return Ok(ApiResponse<AvatarUploadResponse>.Success(new AvatarUploadResponse(avatarUrl)));
    }
}
