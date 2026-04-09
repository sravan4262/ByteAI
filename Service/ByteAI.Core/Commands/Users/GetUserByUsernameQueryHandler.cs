using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Users;

public sealed class GetUserByUsernameQueryHandler(AppDbContext db)
    : IRequestHandler<GetUserByUsernameQuery, User?>
{
    public async Task<User?> Handle(GetUserByUsernameQuery request, CancellationToken cancellationToken)
        => await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username, cancellationToken);
}
