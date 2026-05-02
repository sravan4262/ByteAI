using ByteAI.Core.Moderation;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Services;

/// <summary>
/// Layer 1 (deterministic) moderator tests. Focused on the credit-card / PII shape
/// matching since that's the area most prone to false positives, and the regex was
/// recently tightened from `(?:\d[ -]*?){13,19}` to specific shapes (4-4-4-4, 4-6-5,
/// bare 16, bare 15) to stop matching phone numbers, timestamps, and numeric IDs.
/// Luhn-validity is a real requirement — tests use real Luhn-passing test card numbers.
/// </summary>
public sealed class Layer1ModeratorTests
{
    private readonly Layer1Moderator _sut = new(NullLogger<Layer1Moderator>.Instance);

    // ── Real Luhn-passing test card numbers (industry-standard test PANs) ──────
    //   Visa     16d  4111111111111111
    //   MC       16d  5555555555554444
    //   Amex     15d  378282246310005
    //   Discover 16d  6011111111111117

    [Theory]
    [InlineData("contact me, here's my card 4111111111111111 thanks")]
    [InlineData("Visa: 4111-1111-1111-1111")]
    [InlineData("Visa: 4111 1111 1111 1111")]
    [InlineData("Mastercard 5555 5555 5555 4444 expires 12/27")]
    [InlineData("Amex 378282246310005 cvv 1234")]
    [InlineData("Amex 3782 822463 10005")]
    public async Task Detects_real_card_numbers(string text)
    {
        var result = await _sut.ModerateAsync(text, ModerationContext.Comment);

        Assert.False(result.IsClean);
        Assert.Contains(result.Reasons, r => r.Code == "PII");
    }

    [Theory]
    // 13-digit phone-style numbers (now excluded — were false positives before)
    [InlineData("call 1234567890123 for support")]
    // Long timestamps (Luhn might pass on some — must NOT match)
    [InlineData("event at unix=1733000000000 ms")]
    // 17-digit run (outside our shape set; would have matched the old regex)
    [InlineData("ID 12345678901234567 logged")]
    // 19-digit run (same)
    [InlineData("trace 1234567890123456789 finished")]
    // 14-digit run (deliberately dropped from the new pattern)
    [InlineData("legacy account 12345678901234")]
    // 12-digit numeric IDs
    [InlineData("invoice 123456789012")]
    public async Task Does_not_flag_non_card_digit_runs(string text)
    {
        var result = await _sut.ModerateAsync(text, ModerationContext.Comment);

        Assert.DoesNotContain(result.Reasons, r => r.Code == "PII");
    }

    [Fact]
    public async Task Does_not_flag_card_shaped_but_luhn_invalid()
    {
        // Same 4-4-4-4 shape, but doesn't pass Luhn — should NOT trip the PII flag.
        var result = await _sut.ModerateAsync("number 1234 5678 9012 3456", ModerationContext.Comment);

        Assert.DoesNotContain(result.Reasons, r => r.Code == "PII");
    }
}
