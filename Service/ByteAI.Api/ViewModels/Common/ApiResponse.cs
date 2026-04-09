namespace ByteAI.Api.ViewModels.Common;

public sealed record ApiResponse<T>(T Data)
{
    public static ApiResponse<T> Success(T data) => new(data);
}

public sealed record ApiError(string Code, string Message);

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
