using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Notifications;
using ByteAI.Core.Services.Support;

namespace ByteAI.Core.Business;

public sealed class SupportBusiness(
    ISupportService supportService,
    ICurrentUserService currentUserService,
    INotificationService notifications) : ISupportBusiness
{
    public async Task<Feedback> SubmitFeedbackAsync(string supabaseUserId, string type, string message, string? pageContext, CancellationToken ct)
    {
        var userId   = await ResolveUserIdAsync(supabaseUserId, ct);
        var feedback = await supportService.SubmitFeedbackAsync(userId, type, message, pageContext, ct);

        var preview = feedback.Message.Length > 60
            ? feedback.Message[..60] + "…"
            : feedback.Message;

        await notifications.CreateAsync(
            userId: userId,
            type: "feedback_update",
            payload: new
            {
                feedbackId   = feedback.Id,
                feedbackType = feedback.Type,
                newStatus    = "open",
                preview,
                message      = "Thanks for your feedback! We've received it and will look into it.",
            },
            ct: ct);

        return feedback;
    }

    public async Task<IReadOnlyList<Feedback>> GetMyFeedbackHistoryAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await supportService.GetMyFeedbackHistoryAsync(userId, ct);
    }

    public async Task<PagedResult<Feedback>> GetAllFeedbackAsync(string? type, string? status, int page, int pageSize, CancellationToken ct) =>
        await supportService.GetAllFeedbackAsync(type, status, new PaginationParams(page, Math.Min(pageSize, 100)), ct);

    public async Task<Feedback> UpdateFeedbackStatusAsync(Guid feedbackId, string newStatus, string? adminNote, CancellationToken ct)
    {
        var oldStatus = await supportService.GetOldStatusAsync(feedbackId, ct);
        var updated   = await supportService.UpdateFeedbackStatusAsync(feedbackId, newStatus, adminNote, ct);

        if (updated.UserId.HasValue && oldStatus != newStatus)
            await FireNotificationAsync(updated, ct);

        return updated;
    }

    private async Task FireNotificationAsync(Feedback feedback, CancellationToken ct)
    {
        if (!feedback.UserId.HasValue) return;

        var message = feedback.Status switch
        {
            "reviewed" => "We're looking into your feedback!",
            "closed"   => string.IsNullOrWhiteSpace(feedback.AdminNote)
                              ? "Your feedback has been resolved."
                              : $"Your feedback has been resolved: {feedback.AdminNote}",
            _ => null,
        };

        if (message is null) return;

        var preview = feedback.Message.Length > 60
            ? feedback.Message[..60] + "…"
            : feedback.Message;

        await notifications.CreateAsync(
            userId: feedback.UserId.Value,
            type: "feedback_update",
            payload: new
            {
                feedbackId   = feedback.Id,
                feedbackType = feedback.Type,
                newStatus    = feedback.Status,
                adminNote    = feedback.AdminNote,
                preview,
                message,
            },
            ct: ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found.");
        return userId.Value;
    }
}
