using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Bytes;

public sealed record GetByteByIdQuery(Guid ByteId) : IRequest<Byte?>;
