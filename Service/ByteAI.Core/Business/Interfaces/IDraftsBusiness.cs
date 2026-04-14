using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IDraftsBusiness
{
    Task<Draft> SaveDraftAsync(string clerkId, Guid? draftId, string? title, string? body, string? codeSnippet, string? language, string[] tags, CancellationToken ct);
    Task<PagedResult<Draft>> GetMyDraftsAsync(string clerkId, int page, int pageSize, CancellationToken ct);
    Task<bool> DeleteDraftAsync(string clerkId, Guid draftId, CancellationToken ct);
}
