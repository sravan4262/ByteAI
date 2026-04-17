using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IFeedBusiness
{
    Task<PagedResult<ByteResult>> GetFeedAsync(string? supabaseUserId, int page, int pageSize, List<string>? tags, string filter, CancellationToken ct);
}
