using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Drafts;

public sealed class DraftService(AppDbContext db) : IDraftService
{
    public async Task<Draft> SaveDraftAsync(Guid authorId, Guid? draftId, string? title, string? body, string? codeSnippet, string? language, string[] tags, CancellationToken ct)
    {
        Draft? draft = null;

        if (draftId.HasValue)
            draft = await db.Drafts.FirstOrDefaultAsync(d => d.Id == draftId.Value && d.AuthorId == authorId, ct);

        if (draft is null)
        {
            draft = new Draft { AuthorId = authorId };
            db.Drafts.Add(draft);
        }

        draft.Title = title;
        draft.Body = body;
        draft.CodeSnippet = codeSnippet;
        draft.Language = language;
        draft.Tags = [.. tags];
        draft.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return draft;
    }

    public async Task<PagedResult<Draft>> GetMyDraftsAsync(Guid authorId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Drafts
            .Where(d => d.AuthorId == authorId)
            .OrderByDescending(d => d.UpdatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Draft>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<bool> DeleteDraftAsync(Guid draftId, Guid authorId, CancellationToken ct)
    {
        var draft = await db.Drafts.FirstOrDefaultAsync(d => d.Id == draftId && d.AuthorId == authorId, ct);
        if (draft is null) return false;

        db.Drafts.Remove(draft);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
