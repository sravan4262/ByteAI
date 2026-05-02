using ByteAI.Core.Moderation;

namespace ByteAI.Core.Pipeline;

/// <summary>
/// Marker for MediatR commands that carry user-generated text. Any request implementing
/// this interface gets automatic moderation via <see cref="ModerationPipelineBehavior{TRequest, TResponse}"/>.
/// </summary>
public interface IModeratableCommand
{
    /// <summary>Returns the concatenated free-text fields that should be checked.</summary>
    string GetTextForModeration();

    /// <summary>Drives context-specific rules in the moderator (e.g. tech-relevance for bytes).</summary>
    ModerationContext ModerationContext { get; }
}
