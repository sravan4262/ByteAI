using System.Globalization;
using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.Mentions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Services.Interviews;

public sealed class InterviewService(AppDbContext db, IPublisher publisher, ILogger<InterviewService> logger, IMentionNotifier mentionNotifier) : IInterviewService
{
    public async Task<PagedResult<Interview>> GetInterviewsAsync(PaginationParams pagination, Guid? authorId, string? company, string? role, string? location, List<string>? techStacks, string? difficulty, string sort, CancellationToken ct, Guid? requesterId = null)
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
            .ExcludeBlockedFor(requesterId, db, i => i.AuthorId)
            .Include(i => i.Author)
            .Include(i => i.Comments)
            .Include(i => i.Bookmarks)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .Include(i => i.Locations)
                .ThenInclude(il => il.Location)
            .AsQueryable();

        if (authorId.HasValue)
            query = query.Where(i => i.AuthorId == authorId.Value);
        if (!string.IsNullOrEmpty(company))
            query = query.Where(i => i.Company != null && i.Company.ToLower().Contains(company.ToLower()));
        if (!string.IsNullOrEmpty(role))
            query = query.Where(i => i.Role != null && i.Role.ToLower().Contains(role.ToLower()));
        if (!string.IsNullOrEmpty(location))
        {
            var locLower = location.ToLower();
            var matchIds = db.InterviewLocations
                .Where(il => il.Location.Name.ToLower().Contains(locLower))
                .Select(il => il.InterviewId);
            query = query.Where(i => matchIds.Contains(i.Id));
        }
        if (techStacks is { Count: > 0 })
        {
            var lower = techStacks.Select(t => t.ToLower()).ToList();
            var matchIds = db.InterviewTechStacks
                .Where(its => lower.Contains(its.TechStack.Name.ToLower()))
                .Select(its => its.InterviewId);
            query = query.Where(i => matchIds.Contains(i.Id));
        }
        if (!string.IsNullOrEmpty(difficulty))
        {
            var diff = difficulty.ToLower();
            query = query.Where(i => i.Difficulty == diff);
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

    public Task<List<Company>> GetCompaniesAsync(CancellationToken ct) =>
        db.Companies.AsNoTracking().OrderBy(c => c.Name).ToListAsync(ct);

    public Task<List<InterviewRole>> GetRolesAsync(CancellationToken ct) =>
        db.InterviewRoles.AsNoTracking().OrderBy(r => r.Name).ToListAsync(ct);

    public Task<List<Location>> GetLocationsAsync(CancellationToken ct) =>
        db.Locations.AsNoTracking().OrderBy(l => l.Name).ToListAsync(ct);

    public Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct, Guid? requesterId = null) =>
        db.Interviews
            .AsNoTracking()
            .Where(i => i.IsActive)
            .ExcludeBlockedFor(requesterId, db, i => i.AuthorId)
            .Include(i => i.Author)
            .Include(i => i.Comments)
            .Include(i => i.Bookmarks)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Likes)
            .Include(i => i.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Comments)
            .Include(i => i.Locations)
                .ThenInclude(il => il.Location)
            .FirstOrDefaultAsync(i => i.Id == id, ct);

    public async Task<Interview> CreateInterviewAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string? company, string? role, string? location, string type, CancellationToken ct)
    {
        var entity = new Interview
        {
            Id = Guid.NewGuid(),
            AuthorId = authorId,
            Title = ToTitleCase(title)!,
            Body = body,
            CodeSnippet = codeSnippet,
            Language = language,
            Company = ToTitleCase(company),
            Role = ToTitleCase(role),
            Difficulty = "medium",
            Type = type,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Interviews.Add(entity);

        await UpsertCompanyAsync(entity.Company, ct);
        await UpsertRoleAsync(entity.Role, ct);
        await SetLocationAsync(entity.Id, location, ct);

        await db.SaveChangesAsync(ct);
        await XpAwarder.AwardAsync(db, authorId, "post_interview", logger, ct);

        var snippet = entity.Body.Length > 140 ? entity.Body[..140] : entity.Body;
        await mentionNotifier.NotifyAsync(
            authorId: authorId,
            content: $"{entity.Title}\n{entity.Body}",
            context: new MentionContext("interview", entity.Id, snippet),
            ct: ct);

        return entity;
    }

    public async Task<Interview> CreateInterviewWithQuestionsAsync(Guid authorId, string title, string? company, string? role, string? location, string difficulty, List<InterviewQuestionInput> questions, bool isAnonymous, CancellationToken ct)
    {
        var interview = new Interview
        {
            Id = Guid.NewGuid(),
            AuthorId = authorId,
            Title = ToTitleCase(title)!,
            Body = string.Join("\n\n", questions.Select((q, i) => $"Q{i + 1}: {q.Question}\nA: {q.Answer}")),
            Company = ToTitleCase(company),
            Role = ToTitleCase(role),
            Difficulty = NormalizeDifficulty(difficulty),
            Type = "interview",
            IsAnonymous = isAnonymous,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Interviews.Add(interview);

        await UpsertCompanyAsync(interview.Company, ct);
        await UpsertRoleAsync(interview.Role, ct);
        await SetLocationAsync(interview.Id, location, ct);

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
            .Include(i => i.Locations)
                .ThenInclude(il => il.Location)
            .FirstAsync(i => i.Id == interview.Id, ct);
    }

    public async Task<Interview> UpdateInterviewAsync(Guid id, Guid requestingUserId, string? title, string? body, string? codeSnippet, string? language, string? company, string? role, string? location, CancellationToken ct)
    {
        var entity = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new KeyNotFoundException($"Interview {id} not found");

        if (entity.AuthorId != requestingUserId)
            throw new UnauthorizedAccessException();

        if (title is not null) entity.Title = ToTitleCase(title)!;
        if (body is not null) entity.Body = body;
        if (codeSnippet is not null) entity.CodeSnippet = codeSnippet;
        if (language is not null) entity.Language = language;
        if (company is not null) { entity.Company = ToTitleCase(company); await UpsertCompanyAsync(entity.Company, ct); }
        if (role is not null) { entity.Role = ToTitleCase(role); await UpsertRoleAsync(entity.Role, ct); }
        if (location is not null) await SetLocationAsync(id, location, ct);
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return entity;
    }

    // ── Lookup upserts ─────────────────────────────────────────────────────────

    private async Task UpsertCompanyAsync(string? name, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name)) return;
        var lower = name.ToLower();
        if (!await db.Companies.AnyAsync(c => c.Name.ToLower() == lower, ct))
            db.Companies.Add(new Company { Id = Guid.NewGuid(), Name = name, CreatedAt = DateTime.UtcNow });
    }

    private async Task UpsertRoleAsync(string? name, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name)) return;
        var lower = name.ToLower();
        if (!await db.InterviewRoles.AnyAsync(r => r.Name.ToLower() == lower, ct))
            db.InterviewRoles.Add(new InterviewRole { Id = Guid.NewGuid(), Name = name, CreatedAt = DateTime.UtcNow });
    }

    private async Task UpsertLocationAsync(string name, CancellationToken ct)
    {
        var lower = name.ToLower();
        if (!await db.Locations.AnyAsync(l => l.Name.ToLower() == lower, ct))
            db.Locations.Add(new Location { Id = Guid.NewGuid(), Name = name, CreatedAt = DateTime.UtcNow });
    }

    private async Task SetLocationAsync(Guid interviewId, string? location, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(location)) return;
        var normalized = ToTitleCase(location)!;

        await UpsertLocationAsync(normalized, ct);
        // Save location first so FK is resolvable
        await db.SaveChangesAsync(ct);

        var loc = await db.Locations.FirstAsync(l => l.Name.ToLower() == normalized.ToLower(), ct);

        var alreadyLinked = await db.InterviewLocations
            .AnyAsync(il => il.InterviewId == interviewId && il.LocationId == loc.Id, ct);

        if (!alreadyLinked)
            db.InterviewLocations.Add(new InterviewLocation { InterviewId = interviewId, LocationId = loc.Id });
    }

    private static string? ToTitleCase(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return input;
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(input.Trim().ToLower());
    }

    private static string NormalizeDifficulty(string? input)
    {
        var v = input?.Trim().ToLowerInvariant();
        return v is "easy" or "medium" or "hard" ? v : "medium";
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

        var snippet = body.Length > 140 ? body[..140] : body;
        await mentionNotifier.NotifyAsync(
            authorId: authorId,
            content: body,
            context: new MentionContext("interview_question_comment", entity.Id, snippet),
            ct: ct);

        return await db.InterviewQuestionComments.AsNoTracking()
            .Include(c => c.Author)
            .FirstAsync(c => c.Id == entity.Id, ct);
    }

    public async Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(Guid questionId, PaginationParams pagination, CancellationToken ct, Guid? requesterId = null)
    {
        var query = db.InterviewQuestionComments.AsNoTracking()
            .Include(c => c.Author)
            .Where(c => c.QuestionId == questionId && c.ParentId == null)
            .ExcludeBlockedFor(requesterId, db, c => c.AuthorId)
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

        var snippet = body.Length > 140 ? body[..140] : body;
        await mentionNotifier.NotifyAsync(
            authorId: authorId,
            content: body,
            context: new MentionContext("interview_comment", entity.Id, snippet),
            ct: ct);

        return await db.InterviewComments.AsNoTracking()
            .Include(c => c.Author)
            .FirstAsync(c => c.Id == entity.Id, ct);
    }

    public async Task<PagedResult<InterviewComment>> GetCommentsAsync(Guid interviewId, PaginationParams pagination, CancellationToken ct, Guid? requesterId = null)
    {
        var query = db.InterviewComments.AsNoTracking()
            .Include(c => c.Author)
            .Where(c => c.InterviewId == interviewId && c.ParentId == null)
            .ExcludeBlockedFor(requesterId, db, c => c.AuthorId)
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
            .Include(b => b.Interview)
                .ThenInclude(i => i.Locations)
                    .ThenInclude(il => il.Location)
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
            .Include(i => i.Locations)
                .ThenInclude(il => il.Location)
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
