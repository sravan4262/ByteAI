using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Users;

public sealed record UpdateProfileCommand(
    Guid UserId,
    string? DisplayName,
    string? Bio
) : IRequest<User>;
