namespace ByteAI.Core.Infrastructure;

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize
);

public sealed record PaginationParams(int Page = 1, int PageSize = 20)
{
    public int Skip => (Page - 1) * PageSize;
}

public sealed record ReactionsCount(Guid ByteId, int LikeCount, int Total);
