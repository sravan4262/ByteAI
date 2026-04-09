using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Notifications;
using ByteAI.Core.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
[Tags("Notifications")]
public sealed class NotificationsController(IMediator mediator) : ControllerBase
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
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await mediator.Send(
            new GetNotificationsQuery(userId.Value, new PaginationParams(page, Math.Min(pageSize, 50)), unreadOnly), ct);

        return Ok(ApiResponse<PagedResponse<NotificationResponse>>.Success(
            new PagedResponse<NotificationResponse>(
                result.Items.Select(n => n.ToResponse()).ToList(),
                result.Total, result.Page, result.PageSize)));
    }

    /// <summary>Mark a notification as read.</summary>
    [HttpPut("{id:guid}/read")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> MarkRead(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var ok = await mediator.Send(new MarkNotificationReadCommand(id, userId.Value), ct);
        if (!ok) return NotFound(new ApiError("NOT_FOUND", $"Notification {id} not found."));
        return Ok(ApiResponse<bool>.Success(true));
    }

    private Guid? GetUserId()
    {
        var clerkId = HttpContext.GetClerkUserId();
        return clerkId is not null && Guid.TryParse(clerkId, out var id) ? id : null;
    }
}
