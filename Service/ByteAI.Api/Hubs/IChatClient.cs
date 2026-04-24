namespace ByteAI.Api.Hubs;

public interface IChatClient
{
    Task ReceiveMessage(object payload);
    Task MessageSent(object payload);
}
