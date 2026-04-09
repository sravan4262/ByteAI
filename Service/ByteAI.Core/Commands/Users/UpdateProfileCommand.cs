using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Users;

public sealed record UpdateProfileCommand(
    Guid UserId,
    string? DisplayName,
    string? Bio,
    List<string>? TechStack,
    List<string>? FeedPreferences
) : IRequest<User>;
