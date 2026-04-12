using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Interviews;

public sealed class CreateInterviewCommandHandler(AppDbContext db)
    : IRequestHandler<CreateInterviewCommand, Interview>
{
    public async Task<Interview> Handle(CreateInterviewCommand request, CancellationToken ct)
    {
        var entity = new Interview
        {
            Id = Guid.NewGuid(),
            AuthorId = request.AuthorId,
            Title = request.Title,
            Body = request.Body,
            CodeSnippet = request.CodeSnippet,
            Language = request.Language,
            Company = request.Company,
            Role = request.Role,
            Difficulty = request.Difficulty,
            Type = request.Type,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Interviews.Add(entity);

        if (!string.IsNullOrWhiteSpace(request.Company))
        {
            var companyLower = request.Company.Trim().ToLower();
            var exists = await db.Companies.AnyAsync(c => c.Name.ToLower() == companyLower, ct);
            if (!exists)
                db.Companies.Add(new Entities.Company { Id = Guid.NewGuid(), Name = request.Company.Trim(), CreatedAt = DateTime.UtcNow });
        }

        await db.SaveChangesAsync(ct);
        return entity;
    }
}

public sealed class GetInterviewsQueryHandler(AppDbContext db)
    : IRequestHandler<GetInterviewsQuery, PagedResult<Interview>>
{
    public async Task<PagedResult<Interview>> Handle(GetInterviewsQuery request, CancellationToken ct)
    {
        var query = db.Interviews.AsNoTracking().AsQueryable();
        if (request.AuthorId.HasValue)
            query = query.Where(i => i.AuthorId == request.AuthorId.Value);
        if (!string.IsNullOrEmpty(request.Company))
            query = query.Where(i => i.Company != null && i.Company.ToLower().Contains(request.Company.ToLower()));
        if (!string.IsNullOrEmpty(request.Difficulty))
            query = query.Where(i => i.Difficulty == request.Difficulty);

        query = request.Sort switch
        {
            "top" => query.OrderByDescending(i => i.CreatedAt), // count columns removed; fall back to recency for "top"
            _ => query.OrderByDescending(i => i.CreatedAt)
        };

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip(request.Pagination.Skip).Take(request.Pagination.PageSize).ToListAsync(CancellationToken.None);
        return new PagedResult<Interview>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

public sealed class GetInterviewByIdQueryHandler(AppDbContext db)
    : IRequestHandler<GetInterviewByIdQuery, Interview?>
{
    public Task<Interview?> Handle(GetInterviewByIdQuery request, CancellationToken ct) =>
        db.Interviews.AsNoTracking().FirstOrDefaultAsync(i => i.Id == request.Id, ct);
}

public sealed class UpdateInterviewCommandHandler(AppDbContext db)
    : IRequestHandler<UpdateInterviewCommand, Interview>
{
    public async Task<Interview> Handle(UpdateInterviewCommand request, CancellationToken ct)
    {
        var entity = await db.Interviews.FirstOrDefaultAsync(i => i.Id == request.Id, ct)
            ?? throw new KeyNotFoundException($"Interview {request.Id} not found");
        if (entity.AuthorId != request.RequestingUserId)
            throw new UnauthorizedAccessException();

        if (request.Title is not null) entity.Title = request.Title;
        if (request.Body is not null) entity.Body = request.Body;
        if (request.CodeSnippet is not null) entity.CodeSnippet = request.CodeSnippet;
        if (request.Language is not null) entity.Language = request.Language;
        if (request.Company is not null) entity.Company = request.Company;
        if (request.Role is not null) entity.Role = request.Role;
        if (request.Difficulty is not null) entity.Difficulty = request.Difficulty;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return entity;
    }
}

public sealed class DeleteInterviewCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteInterviewCommand, bool>
{
    public async Task<bool> Handle(DeleteInterviewCommand request, CancellationToken ct)
    {
        var entity = await db.Interviews.FirstOrDefaultAsync(i => i.Id == request.Id, ct);
        if (entity is null) return false;
        if (entity.AuthorId != request.RequestingUserId) throw new UnauthorizedAccessException();
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class CreateInterviewWithQuestionsCommandHandler(AppDbContext db)
    : IRequestHandler<CreateInterviewWithQuestionsCommand, Interview>
{
    public async Task<Interview> Handle(CreateInterviewWithQuestionsCommand request, CancellationToken ct)
    {
        var interview = new Interview
        {
            Id = Guid.NewGuid(),
            AuthorId = request.AuthorId,
            Title = request.Title,
            Body = string.Join("\n\n", request.Questions.Select((q, i) => $"Q{i + 1}: {q.Question}\nA: {q.Answer}")),
            Company = request.Company,
            Role = request.Role,
            Difficulty = request.Difficulty,
            Type = "interview",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Interviews.Add(interview);

        if (!string.IsNullOrWhiteSpace(request.Company))
        {
            var companyLower = request.Company.Trim().ToLower();
            var exists = await db.Companies.AnyAsync(c => c.Name.ToLower() == companyLower, ct);
            if (!exists)
                db.Companies.Add(new Entities.Company { Id = Guid.NewGuid(), Name = request.Company.Trim(), CreatedAt = DateTime.UtcNow });
        }

        for (var i = 0; i < request.Questions.Count; i++)
        {
            var q = request.Questions[i];
            db.InterviewQuestions.Add(new Entities.InterviewQuestion
            {
                Id = Guid.NewGuid(),
                InterviewId = interview.Id,
                Question = q.Question,
                Answer = q.Answer,
                OrderIndex = i,
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync(ct);

        // Reload with questions for the response
        return await db.Interviews
            .Include(i => i.Questions)
            .FirstAsync(i => i.Id == interview.Id, ct);
    }
}

public sealed class AddInterviewCommentCommandHandler(AppDbContext db)
    : IRequestHandler<AddInterviewCommentCommand, InterviewComment>
{
    public async Task<InterviewComment> Handle(AddInterviewCommentCommand request, CancellationToken ct)
    {
        var entity = new InterviewComment
        {
            Id = Guid.NewGuid(),
            InterviewId = request.InterviewId,
            AuthorId = request.AuthorId,
            ParentId = request.ParentId,
            Body = request.Body,
            CreatedAt = DateTime.UtcNow
        };
        db.InterviewComments.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }
}

public sealed class GetInterviewCommentsQueryHandler(AppDbContext db)
    : IRequestHandler<GetInterviewCommentsQuery, PagedResult<InterviewComment>>
{
    public async Task<PagedResult<InterviewComment>> Handle(GetInterviewCommentsQuery request, CancellationToken ct)
    {
        var query = db.InterviewComments.AsNoTracking()
            .Where(c => c.InterviewId == request.InterviewId && c.ParentId == null)
            .OrderByDescending(c => c.VoteCount).ThenBy(c => c.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip(request.Pagination.Skip).Take(request.Pagination.PageSize).ToListAsync(CancellationToken.None);
        return new PagedResult<InterviewComment>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

public sealed class AddInterviewReactionCommandHandler(AppDbContext db)
    : IRequestHandler<AddInterviewReactionCommand, bool>
{
    public async Task<bool> Handle(AddInterviewReactionCommand request, CancellationToken ct)
    {
        var exists = await db.InterviewLikes.AnyAsync(r => r.InterviewId == request.InterviewId && r.UserId == request.UserId, ct);
        if (exists) return false;
        db.InterviewLikes.Add(new InterviewLike { InterviewId = request.InterviewId, UserId = request.UserId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class RemoveInterviewReactionCommandHandler(AppDbContext db)
    : IRequestHandler<RemoveInterviewReactionCommand, bool>
{
    public async Task<bool> Handle(RemoveInterviewReactionCommand request, CancellationToken ct)
    {
        var like = await db.InterviewLikes.FirstOrDefaultAsync(r => r.InterviewId == request.InterviewId && r.UserId == request.UserId, ct);
        if (like is null) return false;
        db.InterviewLikes.Remove(like);
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class AddInterviewBookmarkCommandHandler(AppDbContext db)
    : IRequestHandler<AddInterviewBookmarkCommand, bool>
{
    public async Task<bool> Handle(AddInterviewBookmarkCommand request, CancellationToken ct)
    {
        var existing = await db.InterviewBookmarks
            .FirstOrDefaultAsync(b => b.InterviewId == request.InterviewId && b.UserId == request.UserId, ct);

        if (existing is not null)
        {
            db.InterviewBookmarks.Remove(existing);
            await db.SaveChangesAsync(ct);
            return false; // un-saved
        }

        db.InterviewBookmarks.Add(new InterviewBookmark { InterviewId = request.InterviewId, UserId = request.UserId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);
        return true; // saved
    }
}

public sealed class RemoveInterviewBookmarkCommandHandler(AppDbContext db)
    : IRequestHandler<RemoveInterviewBookmarkCommand, bool>
{
    public async Task<bool> Handle(RemoveInterviewBookmarkCommand request, CancellationToken ct)
    {
        var bookmark = await db.InterviewBookmarks.FirstOrDefaultAsync(b => b.InterviewId == request.InterviewId && b.UserId == request.UserId, ct);
        if (bookmark is null) return false;
        db.InterviewBookmarks.Remove(bookmark);
        await db.SaveChangesAsync(ct);
        return true;
    }
}

// ── Interview with Questions ──────────────────────────────────────────────────

public sealed class GetInterviewWithQuestionsQueryHandler(AppDbContext db)
    : IRequestHandler<GetInterviewWithQuestionsQuery, Interview?>
{
    public Task<Interview?> Handle(GetInterviewWithQuestionsQuery request, CancellationToken ct) =>
        db.Interviews
            .AsNoTracking()
            .Where(i => i.IsActive)
            .Include(i => i.Author)
            .Include(i => i.Comments)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .FirstOrDefaultAsync(i => i.Id == request.InterviewId, ct);
}

public sealed class GetInterviewsWithQuestionsQueryHandler(AppDbContext db)
    : IRequestHandler<GetInterviewsWithQuestionsQuery, PagedResult<Interview>>
{
    public async Task<PagedResult<Interview>> Handle(GetInterviewsWithQuestionsQuery request, CancellationToken ct)
    {
        var query = db.Interviews.AsNoTracking()
            .Where(i => i.IsActive)
            .Include(i => i.Author)
            .Include(i => i.Comments)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .AsQueryable();

        if (request.AuthorId.HasValue)
            query = query.Where(i => i.AuthorId == request.AuthorId.Value);
        if (!string.IsNullOrEmpty(request.Company))
            query = query.Where(i => i.Company != null && i.Company.ToLower().Contains(request.Company.ToLower()));
        if (!string.IsNullOrEmpty(request.Difficulty))
            query = query.Where(i => i.Difficulty == request.Difficulty);
        if (request.TechStacks is { Count: > 0 })
        {
            var lower = request.TechStacks.Select(t => t.ToLower()).ToList();
            var matchIds = db.InterviewTechStacks
                .Where(its => lower.Contains(its.TechStack.Name.ToLower()))
                .Select(its => its.InterviewId);
            query = query.Where(i => matchIds.Contains(i.Id));
        }

        query = request.Sort == "top"
            ? query.OrderByDescending(i => i.CreatedAt)
            : query.OrderByDescending(i => i.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Interview>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

// ── My Interviews (author view) ───────────────────────────────────────────────

public sealed class GetMyInterviewsQueryHandler(AppDbContext db)
    : IRequestHandler<GetMyInterviewsQuery, PagedResult<Interview>>
{
    public async Task<PagedResult<Interview>> Handle(GetMyInterviewsQuery request, CancellationToken ct)
    {
        var query = db.Interviews.AsNoTracking()
            .Where(i => i.AuthorId == request.AuthorId && i.IsActive)
            .Include(i => i.Comments)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .OrderByDescending(i => i.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Interview>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

// ── User Interview Bookmarks ──────────────────────────────────────────────────

public sealed class GetUserInterviewBookmarksQueryHandler(AppDbContext db)
    : IRequestHandler<GetUserInterviewBookmarksQuery, PagedResult<Interview>>
{
    public async Task<PagedResult<Interview>> Handle(GetUserInterviewBookmarksQuery request, CancellationToken ct)
    {
        var query = db.InterviewBookmarks.AsNoTracking()
            .Where(b => b.UserId == request.UserId)
            .OrderByDescending(b => b.CreatedAt)
            .Include(b => b.Interview)
                .ThenInclude(i => i.Comments)
            .Include(b => b.Interview)
                .ThenInclude(i => i.Questions.OrderBy(q => q.OrderIndex))
                    .ThenInclude(q => q.Likes)
            .Include(b => b.Interview)
                .ThenInclude(i => i.Questions.OrderBy(q => q.OrderIndex))
                    .ThenInclude(q => q.Comments)
            .Select(b => b.Interview);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Interview>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

// ── Question Comments ─────────────────────────────────────────────────────────

public sealed class AddQuestionCommentCommandHandler(AppDbContext db)
    : IRequestHandler<AddQuestionCommentCommand, InterviewQuestionComment>
{
    public async Task<InterviewQuestionComment> Handle(AddQuestionCommentCommand request, CancellationToken ct)
    {
        var entity = new Entities.InterviewQuestionComment
        {
            Id = Guid.NewGuid(),
            QuestionId = request.QuestionId,
            AuthorId = request.AuthorId,
            Body = request.Body,
            ParentId = request.ParentId,
            CreatedAt = DateTime.UtcNow
        };
        db.InterviewQuestionComments.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }
}

public sealed class GetQuestionCommentsQueryHandler(AppDbContext db)
    : IRequestHandler<GetQuestionCommentsQuery, PagedResult<InterviewQuestionComment>>
{
    public async Task<PagedResult<InterviewQuestionComment>> Handle(GetQuestionCommentsQuery request, CancellationToken ct)
    {
        var query = db.InterviewQuestionComments.AsNoTracking()
            .Include(c => c.Author)
            .Where(c => c.QuestionId == request.QuestionId && c.ParentId == null)
            .OrderByDescending(c => c.VoteCount).ThenBy(c => c.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip(request.Pagination.Skip).Take(request.Pagination.PageSize).ToListAsync(CancellationToken.None);
        return new PagedResult<InterviewQuestionComment>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

// ── Question Likes ────────────────────────────────────────────────────────────

public sealed class LikeQuestionCommandHandler(AppDbContext db)
    : IRequestHandler<LikeQuestionCommand, bool>
{
    public async Task<bool> Handle(LikeQuestionCommand request, CancellationToken ct)
    {
        var exists = await db.InterviewQuestionLikes
            .AnyAsync(l => l.QuestionId == request.QuestionId && l.UserId == request.UserId, ct);
        if (exists) return false;
        db.InterviewQuestionLikes.Add(new Entities.InterviewQuestionLike
        {
            QuestionId = request.QuestionId,
            UserId = request.UserId,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class UnlikeQuestionCommandHandler(AppDbContext db)
    : IRequestHandler<UnlikeQuestionCommand, bool>
{
    public async Task<bool> Handle(UnlikeQuestionCommand request, CancellationToken ct)
    {
        var like = await db.InterviewQuestionLikes
            .FirstOrDefaultAsync(l => l.QuestionId == request.QuestionId && l.UserId == request.UserId, ct);
        if (like is null) return false;
        db.InterviewQuestionLikes.Remove(like);
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class DeleteInterviewCommentCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteInterviewCommentCommand, bool>
{
    public async Task<bool> Handle(DeleteInterviewCommentCommand request, CancellationToken ct)
    {
        var comment = await db.InterviewComments.FirstOrDefaultAsync(c => c.Id == request.CommentId, ct);
        if (comment is null) return false;
        if (comment.AuthorId != request.AuthorId) throw new UnauthorizedAccessException();
        db.InterviewComments.Remove(comment);
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class DeleteInterviewQuestionCommentCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteInterviewQuestionCommentCommand, bool>
{
    public async Task<bool> Handle(DeleteInterviewQuestionCommentCommand request, CancellationToken ct)
    {
        var comment = await db.InterviewQuestionComments.FirstOrDefaultAsync(c => c.Id == request.CommentId, ct);
        if (comment is null) return false;
        if (comment.AuthorId != request.AuthorId) throw new UnauthorizedAccessException();
        db.InterviewQuestionComments.Remove(comment);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
