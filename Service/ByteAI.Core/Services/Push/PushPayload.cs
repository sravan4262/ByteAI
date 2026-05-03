namespace ByteAI.Core.Services.Push;

/// <summary>
/// One push to one user. The dispatcher fans this out to every device token
/// owned by <see cref="UserId"/>.
/// </summary>
public sealed record PushPayload(
    Guid UserId,
    string Title,
    string Body,
    /// <summary>Optional badge count to set on the app icon. Pass <c>null</c>
    /// to leave the badge unchanged.</summary>
    int? Badge,
    /// <summary>
    /// Free-form data delivered alongside the alert. iOS deep-link handler in
    /// AppDelegate.swift reads <c>byteId</c>, <c>conversationId</c>, and
    /// <c>type</c> to route taps. Keys must be camelCase (matches AppDelegate
    /// userInfo expectations).
    /// </summary>
    IReadOnlyDictionary<string, string> Data
);

/// <summary>Convenience factory methods for the four notification kinds we ship.</summary>
public static class PushPayloads
{
    public static PushPayload Like(Guid recipientId, string actorDisplay, string? byteTitle, Guid byteId) =>
        new(recipientId,
            Title: "New like",
            Body: byteTitle is { Length: > 0 }
                ? $"{actorDisplay} liked “{Truncate(byteTitle, 40)}”"
                : $"{actorDisplay} liked your byte",
            Badge: null,
            Data: new Dictionary<string, string>
            {
                ["type"] = "like",
                ["byteId"] = byteId.ToString()
            });

    public static PushPayload Comment(Guid recipientId, string actorDisplay, string? byteTitle, string preview, Guid byteId) =>
        new(recipientId,
            Title: byteTitle is { Length: > 0 }
                ? $"New comment on “{Truncate(byteTitle, 40)}”"
                : "New comment",
            Body: $"{actorDisplay}: {Truncate(preview, 80)}",
            Badge: null,
            Data: new Dictionary<string, string>
            {
                ["type"] = "comment",
                ["byteId"] = byteId.ToString()
            });

    public static PushPayload Follow(Guid recipientId, string actorDisplay) =>
        new(recipientId,
            Title: "New follower",
            Body: $"{actorDisplay} started following you",
            Badge: null,
            Data: new Dictionary<string, string> { ["type"] = "notification" });

    public static PushPayload Unfollow(Guid recipientId, string actorDisplay) =>
        new(recipientId,
            Title: "Lost a follower",
            Body: $"{actorDisplay} unfollowed you",
            Badge: null,
            Data: new Dictionary<string, string> { ["type"] = "notification" });

    public static PushPayload Mention(
        Guid recipientId, string actorDisplay, string contentType, Guid contentId, string snippet) =>
        new(recipientId,
            Title: $"{actorDisplay} mentioned you",
            Body: Truncate(snippet, 80),
            Badge: null,
            Data: new Dictionary<string, string>
            {
                ["type"] = "mention",
                ["contentType"] = contentType,
                ["contentId"] = contentId.ToString()
            });

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";
}
