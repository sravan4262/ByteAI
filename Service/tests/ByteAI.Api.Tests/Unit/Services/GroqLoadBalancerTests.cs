using ByteAI.Core.Services.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Services;

/// <summary>
/// GroqLoadBalancer is a singleton that tracks rate-limit exhaustion state.
/// Tests verify availability logic and exhaustion transitions using reflection
/// to set private fields directly (avoids needing real HTTP calls).
/// </summary>
public sealed class GroqLoadBalancerTests
{
    private static GroqLoadBalancer Create()
    {
        // IServiceScopeFactory is only used by RestoreAiFlagsAsync (internal, async fire-and-forget).
        // For availability tests we can supply a no-op factory.
        var factory = new Mock<IServiceScopeFactory>();
        factory.Setup(f => f.CreateScope()).Returns(new Mock<IServiceScope>().Object);
        return new GroqLoadBalancer(factory.Object, NullLogger<GroqLoadBalancer>.Instance);
    }

    private static void SetExhausted(GroqLoadBalancer lb, bool primary, bool secondary, DateOnly date)
    {
        var t = typeof(GroqLoadBalancer);
        t.GetField("_primaryRpdExhausted",   System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.SetValue(lb, primary);
        t.GetField("_secondaryRpdExhausted", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.SetValue(lb, secondary);
        t.GetField("_exhaustedDate",         System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.SetValue(lb, date);
    }

    [Fact]
    public void IsAvailable_Initially_ReturnsTrue()
    {
        var lb = Create();
        Assert.True(lb.IsAvailable);
    }

    [Fact]
    public void IsAvailable_OnlyPrimaryExhausted_ReturnsTrue()
    {
        var lb = Create();
        SetExhausted(lb, primary: true, secondary: false, DateOnly.FromDateTime(DateTime.UtcNow));

        Assert.True(lb.IsAvailable);
    }

    [Fact]
    public void IsAvailable_OnlySecondaryExhausted_ReturnsTrue()
    {
        var lb = Create();
        SetExhausted(lb, primary: false, secondary: true, DateOnly.FromDateTime(DateTime.UtcNow));

        Assert.True(lb.IsAvailable);
    }

    [Fact]
    public void IsAvailable_BothExhaustedSameDay_ReturnsFalse()
    {
        var lb = Create();
        SetExhausted(lb, primary: true, secondary: true, DateOnly.FromDateTime(DateTime.UtcNow));

        Assert.False(lb.IsAvailable);
    }

    [Fact]
    public void IsAvailable_BothExhaustedYesterday_ResetsAndReturnsTrue()
    {
        var lb = Create();
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
        SetExhausted(lb, primary: true, secondary: true, yesterday);

        // Should auto-reset since exhaustedDate < today
        Assert.True(lb.IsAvailable);

        // Fields should be cleared
        var t = typeof(GroqLoadBalancer);
        var pri = (bool)t.GetField("_primaryRpdExhausted", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.GetValue(lb)!;
        var sec = (bool)t.GetField("_secondaryRpdExhausted", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.GetValue(lb)!;
        Assert.False(pri);
        Assert.False(sec);
    }

    [Fact]
    public void ModelConstants_HaveExpectedNames()
    {
        Assert.Equal("llama-3.3-70b-versatile", GroqLoadBalancer.Primary);
        Assert.Equal("llama-3.1-8b-instant",    GroqLoadBalancer.Secondary);
    }
}
