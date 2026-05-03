using System.Linq.Expressions;
using ByteAI.Core.Entities;

namespace ByteAI.Core.Infrastructure.Persistence;

public static class UserBlockFilterExtensions
{
    /// <summary>
    /// Filter rows whose author is blocked by, or has blocked, the viewer.
    /// Anonymous viewers (viewerId == null) get the unfiltered query.
    /// authorIdSelector returns the row's author user-id (the user who would
    /// be hidden when blocked).
    /// </summary>
    public static IQueryable<T> ExcludeBlockedFor<T>(
        this IQueryable<T> source,
        Guid? viewerId,
        AppDbContext db,
        Expression<Func<T, Guid>> authorIdSelector)
    {
        if (viewerId is null) return source;

        var param = Expression.Parameter(typeof(T), "x");
        var authorBody = new ParameterReplacer(authorIdSelector.Parameters[0], param)
            .Visit(authorIdSelector.Body)!;

        var ub = Expression.Parameter(typeof(UserBlock), "ub");
        var blockerProp = Expression.Property(ub, nameof(UserBlock.BlockerId));
        var blockedProp = Expression.Property(ub, nameof(UserBlock.BlockedId));
        var viewerConst = Expression.Constant(viewerId.Value, typeof(Guid));

        var lhs = Expression.AndAlso(
            Expression.Equal(blockerProp, viewerConst),
            Expression.Equal(blockedProp, authorBody));
        var rhs = Expression.AndAlso(
            Expression.Equal(blockerProp, authorBody),
            Expression.Equal(blockedProp, viewerConst));

        var anyPredicate = Expression.Lambda<Func<UserBlock, bool>>(
            Expression.OrElse(lhs, rhs), ub);

        var anyCall = Expression.Call(
            typeof(Queryable),
            nameof(Queryable.Any),
            [typeof(UserBlock)],
            Expression.Constant(db.UserBlocks),
            anyPredicate);

        var predicate = Expression.Lambda<Func<T, bool>>(
            Expression.Not(anyCall), param);

        return source.Where(predicate);
    }

    /// <summary>
    /// Like <see cref="ExcludeBlockedFor"/> but for selectors that return Guid?.
    /// Rows with a null author id are kept (no block check possible).
    /// </summary>
    public static IQueryable<T> ExcludeBlockedFor<T>(
        this IQueryable<T> source,
        Guid? viewerId,
        AppDbContext db,
        Expression<Func<T, Guid?>> authorIdSelector)
    {
        if (viewerId is null) return source;

        var param = Expression.Parameter(typeof(T), "x");
        var authorBody = new ParameterReplacer(authorIdSelector.Parameters[0], param)
            .Visit(authorIdSelector.Body)!;
        var hasValue = Expression.Property(authorBody, nameof(Nullable<Guid>.HasValue));
        var value = Expression.Property(authorBody, nameof(Nullable<Guid>.Value));

        var ub = Expression.Parameter(typeof(UserBlock), "ub");
        var blockerProp = Expression.Property(ub, nameof(UserBlock.BlockerId));
        var blockedProp = Expression.Property(ub, nameof(UserBlock.BlockedId));
        var viewerConst = Expression.Constant(viewerId.Value, typeof(Guid));

        var lhs = Expression.AndAlso(
            Expression.Equal(blockerProp, viewerConst),
            Expression.Equal(blockedProp, value));
        var rhs = Expression.AndAlso(
            Expression.Equal(blockerProp, value),
            Expression.Equal(blockedProp, viewerConst));

        var anyPredicate = Expression.Lambda<Func<UserBlock, bool>>(
            Expression.OrElse(lhs, rhs), ub);

        var anyCall = Expression.Call(
            typeof(Queryable),
            nameof(Queryable.Any),
            [typeof(UserBlock)],
            Expression.Constant(db.UserBlocks),
            anyPredicate);

        // !x.AuthorId.HasValue || !db.UserBlocks.Any(...)
        var predicate = Expression.Lambda<Func<T, bool>>(
            Expression.OrElse(Expression.Not(hasValue), Expression.Not(anyCall)),
            param);

        return source.Where(predicate);
    }

    private sealed class ParameterReplacer(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node)
            => node == from ? to : base.VisitParameter(node);
    }
}
