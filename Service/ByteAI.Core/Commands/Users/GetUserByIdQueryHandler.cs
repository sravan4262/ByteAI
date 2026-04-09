using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Users;

public sealed class GetUserByIdQueryHandler(AppDbContext db)
    : IRequestHandler<GetUserByIdQuery, User?>
{
    public async Task<User?> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
        => await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
}
