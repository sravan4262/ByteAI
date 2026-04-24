using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Support;

public sealed class SupportService(AppDbContext db) : ISupportService
{
    private static readonly HashSet<string> ValidTypes   = ["good", "bad", "idea"];
    private static readonly HashSet<string> ValidStatuses = ["open", "reviewed", "closed"];

    public async Task<Feedback> SubmitFeedbackAsync(Guid userId, string type, string message, string? pageContext, CancellationToken ct)
    {
        if (!ValidTypes.Contains(type))
            throw new ArgumentException($"Invalid feedback type '{type}'. Must be: good, bad, idea.");

        var feedback = new Feedback
        {
            Id          = Guid.NewGuid(),
            UserId      = userId,
            Type        = type,
            Message     = message,
            PageContext  = pageContext,
            Status      = "open",
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow,
        };

        db.Feedbacks.Add(feedback);
        await db.SaveChangesAsync(ct);
        return feedback;
    }

    public async Task<IReadOnlyList<Feedback>> GetMyFeedbackHistoryAsync(Guid userId, CancellationToken ct) =>
        await db.Feedbacks
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(5)
            .ToListAsync(ct);

    public async Task<PagedResult<Feedback>> GetAllFeedbackAsync(string? type, string? status, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Feedbacks.AsQueryable();

        if (!string.IsNullOrWhiteSpace(type) && ValidTypes.Contains(type))
            query = query.Where(f => f.Type == type);

        if (!string.IsNullOrWhiteSpace(status) && ValidStatuses.Contains(status))
            query = query.Where(f => f.Status == status);

        query = query.OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Feedback>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<string?> GetOldStatusAsync(Guid feedbackId, CancellationToken ct) =>
        await db.Feedbacks
            .Where(f => f.Id == feedbackId)
            .Select(f => f.Status)
            .FirstOrDefaultAsync(ct);

    public async Task<Feedback> UpdateFeedbackStatusAsync(Guid feedbackId, string newStatus, string? adminNote, CancellationToken ct)
    {
        if (!ValidStatuses.Contains(newStatus))
            throw new ArgumentException($"Invalid status '{newStatus}'. Must be: open, reviewed, closed.");

        var feedback = await db.Feedbacks.FirstOrDefaultAsync(f => f.Id == feedbackId, ct)
            ?? throw new KeyNotFoundException($"Feedback {feedbackId} not found.");

        feedback.Status    = newStatus;
        feedback.AdminNote = adminNote ?? feedback.AdminNote;
        feedback.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return feedback;
    }
}
