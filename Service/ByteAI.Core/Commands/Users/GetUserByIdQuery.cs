using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Users;

public sealed record GetUserByIdQuery(Guid UserId) : IRequest<User?>;
