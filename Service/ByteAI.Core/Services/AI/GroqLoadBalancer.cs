using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Services.AI;

/// <summary>
/// Singleton that manages model selection and rate-limit tracking across all Groq calls.
///
/// Two models in rotation:
///   Primary   — llama-3.3-70b-versatile  (30 RPM, 1K RPD)   higher quality
///   Secondary — llama-3.1-8b-instant     (30 RPM, 14.4K RPD) higher daily quota
///
/// Strategy:
///   - Always prefer Primary.
///   - On 429 per_minute → switch to the other model for that retry (transient, no state).
///   - On 429 per_day   → mark model as RPD-exhausted for today; auto-reset at UTC midnight.
///   - When BOTH models RPD-exhausted → disable all AI feature flags so the UI hides AI buttons.
///   - At UTC midnight → reset RPD state and restore feature flags automatically.
/// </summary>
public sealed class GroqLoadBalancer(IServiceScopeFactory scopeFactory, ILogger<GroqLoadBalancer> logger)
{
    public const string Primary   = "llama-3.3-70b-versatile";
    public const string Secondary = "llama-3.1-8b-instant";

    private static readonly string[] AiFlagKeys = ["ai-ask", "ai-search-ask", "ai-format-code"];

    private readonly object _lock = new();
    private bool _primaryRpdExhausted;
    private bool _secondaryRpdExhausted;
    private DateOnly _exhaustedDate;

    /// <summary>
    /// True if at least one model has remaining daily quota.
    /// Automatically resets both models on a new UTC day.
    /// </summary>
    public bool IsAvailable
    {
        get
        {
            lock (_lock)
            {
                if (!_primaryRpdExhausted || !_secondaryRpdExhausted)
                    return true;

                // New UTC day — auto-reset
                if (DateOnly.FromDateTime(DateTime.UtcNow) > _exhaustedDate)
                {
                    _primaryRpdExhausted   = false;
                    _secondaryRpdExhausted = false;
                    logger.LogInformation("Groq quota reset — new UTC day. Restoring AI feature flags.");
                    _ = RestoreAiFlagsAsync();
                    return true;
                }

                return false;
            }
        }
    }

    /// <summary>Returns the preferred available model (Primary unless RPD-exhausted).</summary>
    public string GetModel()
    {
        lock (_lock)
            return _primaryRpdExhausted ? Secondary : Primary;
    }

    /// <summary>Returns the other model — used for RPM retry without persisting state.</summary>
    public string GetFallback(string current) => current == Primary ? Secondary : Primary;

    /// <summary>
    /// Records that a model has hit its daily (RPD) limit.
    /// If both are now exhausted, disables AI feature flags until tomorrow.
    /// </summary>
    public void RecordRpd(string model)
    {
        bool bothExhausted;
        lock (_lock)
        {
            if (model == Primary)   _primaryRpdExhausted   = true;
            if (model == Secondary) _secondaryRpdExhausted = true;

            bothExhausted = _primaryRpdExhausted && _secondaryRpdExhausted;
            if (bothExhausted)
                _exhaustedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        if (bothExhausted)
        {
            logger.LogWarning("Both Groq models RPD-exhausted. Disabling all AI feature flags until UTC midnight.");
            _ = DisableAiFlagsAsync();
        }
        else
        {
            var fallback = model == Primary ? Secondary : Primary;
            logger.LogWarning("Groq model {Model} RPD-exhausted for today. Falling back to {Fallback}.", model, fallback);
        }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private async Task DisableAiFlagsAsync()
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await db.FeatureFlagTypes
                .Where(f => AiFlagKeys.Contains(f.Key))
                .ExecuteUpdateAsync(s => s.SetProperty(f => f.GlobalOpen, false));

            logger.LogInformation("AI feature flags disabled: {Flags}", string.Join(", ", AiFlagKeys));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to disable AI feature flags after quota exhaustion.");
        }
    }

    private async Task RestoreAiFlagsAsync()
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await db.FeatureFlagTypes
                .Where(f => AiFlagKeys.Contains(f.Key))
                .ExecuteUpdateAsync(s => s.SetProperty(f => f.GlobalOpen, true));

            logger.LogInformation("AI feature flags restored after UTC day reset: {Flags}", string.Join(", ", AiFlagKeys));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to restore AI feature flags after day reset.");
        }
    }
}
