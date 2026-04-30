using System.Threading.Channels;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ByteAI.Core.Services.Push;

/// <summary>
/// Hosted service that owns a bounded channel of pending pushes. Event
/// handlers enqueue work synchronously; this drains the channel concurrently
/// (capped) and resolves device tokens just-in-time so a recipient who
/// signed in on a new device after the event still receives the push.
/// </summary>
public sealed class PushDispatcher(
    IServiceScopeFactory scopeFactory,
    IOptions<ApnsOptions> options,
    ILogger<PushDispatcher> logger)
    : BackgroundService, IPushDispatcher
{
    // Bounded with backpressure: if the queue ever saturates, callers don't
    // block — the oldest item drops. A flooded queue means APNs is unhealthy
    // and we'd rather miss a few notifications than starve request threads.
    private readonly Channel<PushPayload> _channel = Channel.CreateBounded<PushPayload>(
        new BoundedChannelOptions(capacity: 4096)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = false,
            SingleWriter = false,
        });

    private readonly ApnsOptions _options = options.Value;
    private const int Concurrency = 4;

    public void Enqueue(PushPayload payload)
    {
        if (!_options.IsConfigured)
        {
            // Skip silently in dev / pre-config — the in-app notification still
            // exists; APNs is a best-effort overlay.
            return;
        }
        _channel.Writer.TryWrite(payload);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.IsConfigured)
        {
            logger.LogInformation("APNs not configured; PushDispatcher will skip pushes.");
            return;
        }

        var workers = Enumerable.Range(0, Concurrency)
            .Select(_ => RunWorkerAsync(stoppingToken))
            .ToArray();
        await Task.WhenAll(workers);
    }

    private async Task RunWorkerAsync(CancellationToken stoppingToken)
    {
        await foreach (var payload in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await DispatchAsync(payload, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "PushDispatcher worker dropped one payload for user {UserId}", payload.UserId);
            }
        }
    }

    /// <summary>
    /// Resolve all device tokens for the recipient, fan out to APNs, and
    /// delete any tokens APNs marks invalid in the same scope.
    /// </summary>
    private async Task DispatchAsync(PushPayload payload, CancellationToken ct)
    {
        // Each payload runs in its own DI scope so EF Core / DbContext don't
        // outlive the work. The sender + JWT provider are singletons (HTTP
        // client + key cache) and cross scopes safely.
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IPushSenderService>();

        var tokens = await db.DeviceTokens
            .AsNoTracking()
            .Where(d => d.UserId == payload.UserId)
            .Select(d => d.Token)
            .ToListAsync(ct);

        if (tokens.Count == 0) return;

        var staleTokens = new List<string>();
        foreach (var token in tokens)
        {
            var result = await sender.SendAsync(token, payload, ct);
            switch (result.Outcome)
            {
                case PushSendOutcome.InvalidToken:
                    staleTokens.Add(token);
                    break;
                case PushSendOutcome.NotConfigured:
                    // Configuration vanished mid-loop — bail rather than
                    // hammering a misconfigured sender.
                    return;
                case PushSendOutcome.Sent:
                case PushSendOutcome.Transient:
                default:
                    break;
            }
        }

        if (staleTokens.Count > 0)
        {
            await db.DeviceTokens
                .Where(d => staleTokens.Contains(d.Token))
                .ExecuteDeleteAsync(ct);
            logger.LogInformation(
                "Pruned {Count} stale device token(s) for user {UserId}",
                staleTokens.Count, payload.UserId);
        }
    }
}
