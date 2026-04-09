using MediatR;

namespace ByteAI.Core.Commands.Search;

public sealed record SearchQuery(
    string Q,
    int Limit = 20,
    Guid? UserId = null    // if provided, user's interest_embedding used for vector search
) : IRequest<List<Entities.Byte>>;
