namespace ByteAI.Core.Services.Push;

/// <summary>
/// Fire-and-forget push enqueue. Event handlers call <see cref="Enqueue"/>
/// after a notification row is committed; the background dispatcher drains
/// the channel asynchronously so APNs latency never blocks the request path.
/// </summary>
public interface IPushDispatcher
{
    void Enqueue(PushPayload payload);
}
