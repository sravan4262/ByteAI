using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireRole("user")]
[Produces("application/json")]
[Tags("Notifications")]
public sealed class NotificationsController(INotificationsBusiness notificationsBusiness) : ControllerBase
{
    /// <summary>List the authenticated user's notifications.</summary>
    /// <param name="unreadOnly">When <c>true</c>, returns only unread notifications.</param>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<NotificationResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<PagedResponse<NotificationResponse>>>> GetNotifications(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await notificationsBusiness.GetNotificationsAsync(clerkId, page, pageSize, unreadOnly, ct);
            return Ok(ApiResponse<PagedResponse<NotificationResponse>>.Success(
                new PagedResponse<NotificationResponse>(
                    result.Items.Select(n => n.ToResponse()).ToList(),
                    result.Total, result.Page, result.PageSize)));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Mark a notification as read.</summary>
    [HttpPut("{id:guid}/read")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> MarkRead(Guid id, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await notificationsBusiness.MarkReadAsync(clerkId, id, ct);
            if (!ok) return NotFound(new ApiError("NOT_FOUND", $"Notification {id} not found."));
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Mark all notifications as read for the current user.</summary>
    [HttpPut("read-all")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<bool>>> MarkAllRead(CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            await notificationsBusiness.MarkAllReadAsync(clerkId, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Delete a notification.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await notificationsBusiness.DeleteAsync(clerkId, id, ct);
            if (!ok) return NotFound(new ApiError("NOT_FOUND", $"Notification {id} not found."));
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Get unread notification count for the current user.</summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<int>>> GetUnreadCount(CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var count = await notificationsBusiness.GetUnreadCountAsync(clerkId, ct);
            return Ok(ApiResponse<int>.Success(count));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
