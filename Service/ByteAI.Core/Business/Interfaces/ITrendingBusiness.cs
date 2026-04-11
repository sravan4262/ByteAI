namespace ByteAI.Core.Business.Interfaces;

public interface ITrendingBusiness
{
    Task RecordClickAsync(Guid contentId, string contentType, string? clerkId, CancellationToken ct);
    Task<List<Guid>> GetTrendingAsync(int page, int pageSize, string contentType, CancellationToken ct);
}
