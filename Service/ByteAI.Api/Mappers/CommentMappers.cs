using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;

namespace ByteAI.Api.Mappers;

public static class CommentMappers
{
    public static CommentResponse ToResponse(this Comment entity) =>
        new(
            Id: entity.Id,
            ByteId: entity.ByteId,
            AuthorId: entity.AuthorId,
            ParentId: entity.ParentId,
            Body: entity.Body,
            VoteCount: entity.VoteCount,
            CreatedAt: entity.CreatedAt
        );
}
