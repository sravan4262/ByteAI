using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Services.Interviews;

public sealed class InterviewService(AppDbContext db, IPublisher publisher, ILogger<InterviewService> logger) : IInterviewService
{
    public async Task<PagedResult<Interview>> GetInterviewsAsync(PaginationParams pagination, Guid? authorId, string? company, string? difficulty, List<string>? techStacks, string sort, CancellationToken ct, Guid? requesterId = null)
    {
        // Privacy: block private author's interviews from non-owners
        if (authorId.HasValue && requesterId != authorId.Value)
        {
            var prefs = await db.UserPreferences.FindAsync([authorId.Value], ct);
            if (prefs?.Visibility == "private")
                return new PagedResult<Interview>([], 0, pagination.Page, pagination.PageSize);
        }

        var query = db.Interviews.AsNoTracking()
            .Where(i => i.IsActive)
            .Include(i => i.Author)
            .Include(i => i.Comments)
            .Include(i => i.Bookmarks)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .AsQueryable();

        if (authorId.HasValue)
            query = query.Where(i => i.AuthorId == authorId.Value);
        if (!string.IsNullOrEmpty(company))
            query = query.Where(i => i.Company != null && i.Company.ToLower().Contains(company.ToLower()));
        if (!string.IsNullOrEmpty(difficulty))
            query = query.Where(i => i.Difficulty == difficulty);
        if (techStacks is { Count: > 0 })
        {
            var lower = techStacks.Select(t => t.ToLower()).ToList();
            var matchIds = db.InterviewTechStacks
                .Where(its => lower.Contains(its.TechStack.Name.ToLower()))
                .Select(its => its.InterviewId);
            query = query.Where(i => matchIds.Contains(i.Id));
        }

        query = sort == "top"
            ? query.OrderByDescending(i => i.CreatedAt)
            : query.OrderByDescending(i => i.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Interview>(items, total, pagination.Page, pagination.PageSize);
    }

    public Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct) =>
        db.Interviews
            .AsNoTracking()
            .Where(i => i.IsActive)
            .Include(i => i.Author)
            .Include(i => i.Comments)
            .Include(i => i.Bookmarks)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .FirstOrDefaultAsync(i => i.Id == id, ct);

    public async Task<Interview> CreateInterviewAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string? company, string? role, string difficulty, string type, CancellationToken ct)
    {
        var entity = new Interview
        {
            Id = Guid.NewGuid(),
            AuthorId = authorId,
            Title = title,
            Body = body,
            CodeSnippet = codeSnippet,
            Language = language,
            Company = company,
            Role = role,
            Difficulty = difficulty,
            Type = type,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Interviews.Add(entity);

        if (!string.IsNullOrWhiteSpace(company))
        {
            var companyLower = company.Trim().ToLower();
            var exists = await db.Companies.AnyAsync(c => c.Name.ToLower() == companyLower, ct);
            if (!exists)
                db.Companies.Add(new Company { Id = Guid.NewGuid(), Name = company.Trim(), CreatedAt = DateTime.UtcNow });
        }

        await db.SaveChangesAsync(ct);
        await XpAwarder.AwardAsync(db, authorId, "post_interview", logger, ct);
        return entity;
    }

    public async Task<Interview> CreateInterviewWithQuestionsAsync(Guid authorId, string title, string? company, string? role, string difficulty, List<InterviewQuestionInput> questions, CancellationToken ct)
    {
        var interview = new Interview
        {
            Id = Guid.NewGuid(),
            AuthorId = authorId,
            Title = title,
            Body = string.Join("\n\n", questions.Select((q, i) => $"Q{i + 1}: {q.Question}\nA: {q.Answer}")),
            Company = company,
            Role = role,
            Difficulty = difficulty,
            Type = "interview",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Interviews.Add(interview);

        if (!string.IsNullOrWhiteSpace(company))
        {
            var companyLower = company.Trim().ToLower();
            var exists = await db.Companies.AnyAsync(c => c.Name.ToLower() == companyLower, ct);
            if (!exists)
                db.Companies.Add(new Company { Id = Guid.NewGuid(), Name = company.Trim(), CreatedAt = DateTime.UtcNow });
        }

        for (var i = 0; i < questions.Count; i++)
        {
            var q = questions[i];
            db.InterviewQuestions.Add(new InterviewQuestion
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
        await XpAwarder.AwardAsync(db, authorId, "post_interview", logger, ct);

        return await db.Interviews
            .Include(i => i.Questions)
            .FirstAsync(i => i.Id == interview.Id, ct);
    }

    public async Task<Interview> UpdateInterviewAsync(Guid id, Guid requestingUserId, string? title, string? body, string? codeSnippet, string? language, string? company, string? role, string? difficulty, CancellationToken ct)
    {
        var entity = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new KeyNotFoundException($"Interview {id} not found");

        if (entity.AuthorId != requestingUserId)
            throw new UnauthorizedAccessException();

        if (title is not null) entity.Title = title;
        if (body is not null) entity.Body = body;
        if (codeSnippet is not null) entity.CodeSnippet = codeSnippet;
        if (language is not null) entity.Language = language;
        if (company is not null) entity.Company = company;
        if (role is not null) entity.Role = role;
        if (difficulty is not null) entity.Difficulty = difficulty;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<bool> DeleteInterviewAsync(Guid id, Guid requestingUserId, CancellationToken ct)
    {
        var entity = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (entity is null) return false;
        if (entity.AuthorId != requestingUserId) throw new UnauthorizedAccessException();
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task LikeQuestionAsync(Guid questionId, Guid userId, CancellationToken ct)
    {
        var exists = await db.InterviewQuestionLikes
            .AnyAsync(l => l.QuestionId == questionId && l.UserId == userId, ct);
        if (exists) return;
        db.InterviewQuestionLikes.Add(new InterviewQuestionLike
        {
            QuestionId = questionId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }

    public async Task UnlikeQuestionAsync(Guid questionId, Guid userId, CancellationToken ct)
    {
        var like = await db.InterviewQuestionLikes
            .FirstOrDefaultAsync(l => l.QuestionId == questionId && l.UserId == userId, ct);
        if (like is null) return;
        db.InterviewQuestionLikes.Remove(like);
        await db.SaveChangesAsync(ct);
    }

    public async Task<InterviewQuestionComment> AddQuestionCommentAsync(Guid questionId, Guid authorId, string body, Guid? parentId, CancellationToken ct)
    {
        var entity = new InterviewQuestionComment
        {
            Id = Guid.NewGuid(),
            QuestionId = questionId,
            AuthorId = authorId,
            Body = body,
            ParentId = parentId,
            CreatedAt = DateTime.UtcNow
        };
        db.InterviewQuestionComments.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(Guid questionId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.InterviewQuestionComments.AsNoTracking()
            .Include(c => c.Author)
            .Where(c => c.QuestionId == questionId && c.ParentId == null)
            .OrderByDescending(c => c.VoteCount).ThenBy(c => c.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(CancellationToken.None);
        return new PagedResult<InterviewQuestionComment>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<InterviewComment> AddCommentAsync(Guid interviewId, Guid authorId, string body, Guid? parentId, CancellationToken ct)
    {
        var entity = new InterviewComment
        {
            Id = Guid.NewGuid(),
            InterviewId = interviewId,
            AuthorId = authorId,
            ParentId = parentId,
            Body = body,
            CreatedAt = DateTime.UtcNow
        };
        db.InterviewComments.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<PagedResult<InterviewComment>> GetCommentsAsync(Guid interviewId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.InterviewComments.AsNoTracking()
            .Where(c => c.InterviewId == interviewId && c.ParentId == null)
            .OrderByDescending(c => c.VoteCount).ThenBy(c => c.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(CancellationToken.None);
        return new PagedResult<InterviewComment>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task AddReactionAsync(Guid interviewId, Guid userId, string reactionType, CancellationToken ct)
    {
        var exists = await db.InterviewLikes.AnyAsync(r => r.InterviewId == interviewId && r.UserId == userId, ct);
        if (exists) return;
        db.InterviewLikes.Add(new InterviewLike { InterviewId = interviewId, UserId = userId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);
    }

    public async Task RemoveReactionAsync(Guid interviewId, Guid userId, CancellationToken ct)
    {
        var like = await db.InterviewLikes.FirstOrDefaultAsync(r => r.InterviewId == interviewId && r.UserId == userId, ct);
        if (like is null) return;
        db.InterviewLikes.Remove(like);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> ToggleBookmarkAsync(Guid interviewId, Guid userId, CancellationToken ct)
    {
        var existing = await db.InterviewBookmarks
            .FirstOrDefaultAsync(b => b.InterviewId == interviewId && b.UserId == userId, ct);

        if (existing is not null)
        {
            db.InterviewBookmarks.Remove(existing);
            await db.SaveChangesAsync(ct);
            return false;
        }

        db.InterviewBookmarks.Add(new InterviewBookmark { InterviewId = interviewId, UserId = userId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);

        var interviewAuthorId = await db.Interviews
            .Where(i => i.Id == interviewId)
            .Select(i => i.AuthorId)
            .FirstOrDefaultAsync(CancellationToken.None);

        await publisher.Publish(new ContentBookmarkedEvent(userId, interviewAuthorId, BookmarkedContentType.Interview), CancellationToken.None);

        return true;
    }

    public async Task<PagedResult<Interview>> GetUserBookmarksAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.InterviewBookmarks.AsNoTracking()
            .Where(b => b.UserId == userId)
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
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Interview>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<Interview>> GetMyInterviewsAsync(Guid authorId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Interviews.AsNoTracking()
            .Where(i => i.AuthorId == authorId && i.IsActive)
            .Include(i => i.Comments)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .OrderByDescending(i => i.CreatedAt);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Interview>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId, CancellationToken ct)
    {
        var comment = await db.InterviewComments.FirstOrDefaultAsync(c => c.Id == commentId, ct);
        if (comment is null) return false;
        if (comment.AuthorId != authorId) throw new UnauthorizedAccessException();
        db.InterviewComments.Remove(comment);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteQuestionCommentAsync(Guid commentId, Guid authorId, CancellationToken ct)
    {
        var comment = await db.InterviewQuestionComments.FirstOrDefaultAsync(c => c.Id == commentId, ct);
        if (comment is null) return false;
        if (comment.AuthorId != authorId) throw new UnauthorizedAccessException();
        db.InterviewQuestionComments.Remove(comment);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
