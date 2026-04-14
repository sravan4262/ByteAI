using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Drafts;

public interface IDraftService
{
    Task<Draft> SaveDraftAsync(Guid authorId, Guid? draftId, string? title, string? body, string? codeSnippet, string? language, string[] tags, CancellationToken ct);
    Task<PagedResult<Draft>> GetMyDraftsAsync(Guid authorId, PaginationParams pagination, CancellationToken ct);
    Task<bool> DeleteDraftAsync(Guid draftId, Guid authorId, CancellationToken ct);
}
