using ByteAI.Core.Commands.Trending;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Services.Trending;

public sealed class TrendingService(IMediator mediator) : ITrendingService
{
    public async Task RecordClickAsync(Guid contentId, string contentType, Guid? userId, CancellationToken ct)
        => await mediator.Send(new RecordClickCommand(contentId, contentType, userId), ct);

    public Task<List<Guid>> GetTrendingIdsAsync(PaginationParams pagination, string contentType, CancellationToken ct)
        => mediator.Send(new GetTrendingQuery(pagination, contentType), ct);
}
