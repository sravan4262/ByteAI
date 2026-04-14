using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;

namespace ByteAI.Api.Mappers;

public static class DraftMappers
{
    public static DraftResponse ToResponse(this Draft draft) => new(
        draft.Id,
        draft.AuthorId,
        draft.Title,
        draft.Body,
        draft.CodeSnippet,
        draft.Language,
        [.. draft.Tags],
        draft.CreatedAt,
        draft.UpdatedAt
    );
}
