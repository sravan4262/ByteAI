using System.Text.RegularExpressions;

namespace ByteAI.Core.Services.Mentions;

public interface IMentionExtractor
{
    /// <summary>
    /// Returns the distinct lowercased usernames referenced as @username in the
    /// content. Trims trailing punctuation. Caps at 10 mentions per post to
    /// prevent abuse.
    /// </summary>
    IReadOnlyList<string> Extract(string? content);
}

public sealed partial class MentionExtractor : IMentionExtractor
{
    // Username constraint from users.users.username CHECK: 3-50 chars (no charset
    // restriction in DB). We accept letters/digits/underscore — common social-media
    // handle shape — and ignore handles outside that pattern. Lookahead/behind
    // prevent matching inside emails (foo@bar.com) or word continuations.
    [GeneratedRegex(@"(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,50})(?![A-Za-z0-9_])", RegexOptions.Compiled)]
    private static partial Regex Pattern();

    public IReadOnlyList<string> Extract(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return [];
        return Pattern().Matches(content)
            .Select(m => m.Groups[1].Value.ToLowerInvariant())
            .Distinct()
            .Take(10)
            .ToList();
    }
}
