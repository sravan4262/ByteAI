using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Bytes;

public sealed record UpdateByteCommand(
    Guid ByteId,
    Guid AuthorId,
    string? Title,
    string? Body,
    string? CodeSnippet,
    string? Language,
    List<string>? Tags
) : IRequest<Byte>;
