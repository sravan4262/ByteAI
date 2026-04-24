using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface ISupportBusiness
{
    Task<Feedback> SubmitFeedbackAsync(string supabaseUserId, string type, string message, string? pageContext, CancellationToken ct);
    Task<IReadOnlyList<Feedback>> GetMyFeedbackHistoryAsync(string supabaseUserId, CancellationToken ct);
    Task<PagedResult<Feedback>> GetAllFeedbackAsync(string? type, string? status, int page, int pageSize, CancellationToken ct);
    Task<Feedback> UpdateFeedbackStatusAsync(Guid feedbackId, string newStatus, string? adminNote, CancellationToken ct);
}
