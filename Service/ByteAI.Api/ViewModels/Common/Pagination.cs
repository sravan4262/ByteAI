namespace ByteAI.Api.ViewModels.Common;

public sealed record PaginationRequest(int Page = 1, int PageSize = 20);
