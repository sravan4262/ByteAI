using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Api.Mappers;

public static class ReactionMappers
{
    public static ReactionResponse ToResponse(this Reaction entity) =>
        new(entity.ByteId, entity.UserId, entity.Type, entity.CreatedAt);

    public static ReactionsCountResponse ToResponse(this ReactionsCount count) =>
        new(count.ByteId, count.LikeCount, count.Total);
}
