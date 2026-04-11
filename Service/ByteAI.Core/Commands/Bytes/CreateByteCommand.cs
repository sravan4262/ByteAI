using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Bytes;

public sealed record CreateByteCommand(
    Guid AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string Type = "article"
) : IRequest<Byte>;
