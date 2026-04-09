using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bytes;

public sealed class GetByteByIdQueryHandler(AppDbContext db)
    : IRequestHandler<GetByteByIdQuery, Byte?>
{
    public async Task<Byte?> Handle(GetByteByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await db.Bytes.FirstOrDefaultAsync(b => b.Id == request.ByteId, cancellationToken);
        if (entity is null) return null;

        entity.ViewCount++;
        await db.SaveChangesAsync(cancellationToken);
        return entity;
    }
}
