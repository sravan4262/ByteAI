using MediatR;

namespace ByteAI.Core.Commands.Bytes;

public sealed record DeleteByteCommand(Guid ByteId, Guid AuthorId) : IRequest<bool>;
