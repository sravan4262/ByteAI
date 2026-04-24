using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Support;

public interface ISupportService
{
    Task<Feedback> SubmitFeedbackAsync(Guid userId, string type, string message, string? pageContext, CancellationToken ct);
    Task<IReadOnlyList<Feedback>> GetMyFeedbackHistoryAsync(Guid userId, CancellationToken ct);
    Task<PagedResult<Feedback>> GetAllFeedbackAsync(string? type, string? status, PaginationParams pagination, CancellationToken ct);
    Task<string?> GetOldStatusAsync(Guid feedbackId, CancellationToken ct);
    Task<Feedback> UpdateFeedbackStatusAsync(Guid feedbackId, string newStatus, string? adminNote, CancellationToken ct);
}
