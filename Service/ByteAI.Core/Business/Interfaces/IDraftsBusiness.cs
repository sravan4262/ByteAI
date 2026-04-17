using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IDraftsBusiness
{
    Task<Draft> SaveDraftAsync(string supabaseUserId, Guid? draftId, string? title, string? body, string? codeSnippet, string? language, string[] tags, CancellationToken ct);
    Task<PagedResult<Draft>> GetMyDraftsAsync(string supabaseUserId, int page, int pageSize, CancellationToken ct);
    Task<bool> DeleteDraftAsync(string supabaseUserId, Guid draftId, CancellationToken ct);
}
