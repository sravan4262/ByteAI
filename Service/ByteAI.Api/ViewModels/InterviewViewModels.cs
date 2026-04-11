namespace ByteAI.Api.ViewModels;

public sealed record CreateInterviewRequest(
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string? Company,
    string? Role,
    string Difficulty = "medium",
    string Type = "interview"
);

public sealed record UpdateInterviewRequest(
    string? Title,
    string? Body,
    string? CodeSnippet,
    string? Language,
    string? Company,
    string? Role,
    string? Difficulty
);

public sealed record InterviewResponse(
    Guid Id,
    Guid AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string? Company,
    string? Role,
    string Difficulty,
    string Type,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record AddInterviewCommentRequest(string Body, Guid? ParentId = null);
public sealed record AddInterviewReactionRequest(string Type = "like");

// Interview with structured Q&A questions
public sealed record InterviewQuestionRequest(string Question, string Answer);

public sealed record CreateInterviewWithQuestionsRequest(
    string Title,
    string? Company,
    string? Role,
    string Difficulty = "medium",
    List<InterviewQuestionRequest>? Questions = null
);

public sealed record InterviewQuestionResponse(
    Guid Id,
    string Question,
    string Answer,
    int OrderIndex,
    int LikeCount,
    int CommentCount,
    bool IsLiked
);

public sealed record InterviewWithQuestionsResponse(
    Guid Id,
    Guid AuthorId,
    string Title,
    string? Company,
    string? Role,
    string Difficulty,
    string Type,
    DateTime CreatedAt,
    int CommentCount,
    List<InterviewQuestionResponse> Questions
);
