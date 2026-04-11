using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;

namespace ByteAI.Api.Mappers;

public static class BookmarkMappers
{
    public static BookmarkResponse ToResponse(this UserBookmark entity) =>
        new(entity.ByteId, entity.UserId, entity.CreatedAt);
}
