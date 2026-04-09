using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bytes;

public sealed class DeleteByteCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteByteCommand, bool>
{
    public async Task<bool> Handle(DeleteByteCommand request, CancellationToken cancellationToken)
    {
        var entity = await db.Bytes.FirstOrDefaultAsync(b => b.Id == request.ByteId, cancellationToken);
        if (entity is null) return false;

        if (entity.AuthorId != request.AuthorId)
            throw new UnauthorizedAccessException("Cannot delete another user's byte");

        db.Bytes.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
