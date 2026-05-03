using ByteAI.Core.Commands.Search;
using ByteAI.Core.Entities;

namespace ByteAI.Core.Business.Interfaces;

public interface ISearchBusiness
{
    Task<List<SearchResultDto>> SearchContentAsync(string q, string type, int limit, CancellationToken ct, string? supabaseUserId = null);
    Task<List<User>> SearchPeopleAsync(string q, int limit, CancellationToken ct, string? supabaseUserId = null);
}
