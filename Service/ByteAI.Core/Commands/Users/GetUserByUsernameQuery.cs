using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Users;

public sealed record GetUserByUsernameQuery(string Username) : IRequest<User?>;
