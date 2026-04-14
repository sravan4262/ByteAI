using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bytes;

public sealed class GetByteByIdQueryHandler(AppDbContext db)
    : IRequestHandler<GetByteByIdQuery, ByteResult?>
{
    public async Task<ByteResult?> Handle(GetByteByIdQuery request, CancellationToken cancellationToken)
    {
        return await db.Bytes
            .Where(b => b.Id == request.ByteId && b.IsActive)
            .Join(db.Users, b => b.AuthorId, u => u.Id, (b, u) => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count(), false, false,
                u.Username, u.DisplayName ?? u.Username, u.AvatarUrl, u.RoleTitle, u.Company))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
