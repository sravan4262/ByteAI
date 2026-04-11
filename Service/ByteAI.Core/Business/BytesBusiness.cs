using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Bytes;

namespace ByteAI.Core.Business;

public sealed class BytesBusiness(IByteService byteService, ICurrentUserService currentUserService) : IBytesBusiness
{
    public async Task<PagedResult<ByteResult>> GetBytesAsync(int page, int pageSize, Guid? authorId, string sort, CancellationToken ct) =>
        await byteService.GetBytesAsync(new PaginationParams(page, Math.Min(pageSize, 100)), authorId, sort, ct);

    public async Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct) =>
        await byteService.GetByteByIdAsync(byteId, ct);

    public async Task<CreateByteResult> CreateByteAsync(string clerkId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct, bool force = false)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        var result = await byteService.CreateByteAsync(authorId, title, body, codeSnippet, language, type, ct, force);
        return new CreateByteResult(result.Id, result.AuthorId, result.Title, result.Body, result.Type, result.CreatedAt);
    }

    public async Task<Byte> UpdateByteAsync(string clerkId, Guid byteId, string? title, string? body, string? codeSnippet, string? language, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        return await byteService.UpdateByteAsync(byteId, authorId, title, body, codeSnippet, language, ct);
    }

    public async Task<bool> DeleteByteAsync(string clerkId, Guid byteId, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        return await byteService.DeleteByteAsync(byteId, authorId, ct);
    }

    public async Task<PagedResult<ByteResult>> GetMyBytesAsync(string clerkId, int page, int pageSize, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        return await byteService.GetMyBytesAsync(authorId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string clerkId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        return userId.Value;
    }
}
