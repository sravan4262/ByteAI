using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Drafts;

namespace ByteAI.Core.Business;

public sealed class DraftsBusiness(IDraftService draftService, ICurrentUserService currentUserService) : IDraftsBusiness
{
    public async Task<Draft> SaveDraftAsync(string clerkId, Guid? draftId, string? title, string? body, string? codeSnippet, string? language, string[] tags, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        return await draftService.SaveDraftAsync(authorId, draftId, title, body, codeSnippet, language, tags, ct);
    }

    public async Task<PagedResult<Draft>> GetMyDraftsAsync(string clerkId, int page, int pageSize, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        return await draftService.GetMyDraftsAsync(authorId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);
    }

    public async Task<bool> DeleteDraftAsync(string clerkId, Guid draftId, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        return await draftService.DeleteDraftAsync(draftId, authorId, ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string clerkId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        return userId.Value;
    }
}
