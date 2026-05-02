using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Moderation;

/// <summary>
/// Deterministic moderation pass. Cheap, in-memory, runs first. Catches:
///   - Severe slurs (small hardcoded blocklist — High severity)
///   - PII patterns: credit card (Luhn), SSN, raw 16-digit numbers (Medium)
///   - URL spam: more than 5 links, or any blocked-shortener domain (Medium / High)
///   - Gibberish heuristics on words >3 chars: low Shannon entropy or vowel-starved words (Medium)
///
/// Conscious tradeoffs:
///   - Blocklist is intentionally short and unambiguous to avoid the Scunthorpe problem.
///   - PII flags rather than blocks — caller (or pipeline) decides whether to reject or only log.
///   - Short text (&lt;20 chars) skips the gibberish check; too noisy on tiny inputs.
/// </summary>
public sealed class Layer1Moderator(ILogger<Layer1Moderator> logger) : IModerationService
{
    // Severe slurs — kept short and unambiguous. Add to this list with caution; broad
    // lists trigger false positives on legitimate words (the Scunthorpe problem).
    // NOTE: The blocklist below is the ascii ROT13 of the actual words to keep this
    // file safe-for-work in code review and indexer output. Decoded once at static init.
    private static readonly HashSet<string> Blocklist = BuildBlocklist();

    private static readonly string[] BlockedDomains =
    [
        "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly",
        "is.gd", "buff.ly", "cutt.ly", "shorte.st", "adf.ly"
    ];

    // SSN-like: 3-2-4
    private static readonly Regex SsnRegex = new(@"\b\d{3}-\d{2}-\d{4}\b", RegexOptions.Compiled);

    // Raw 16-digit run (with optional spaces or dashes between groups of 4) — credit-card-shaped
    private static readonly Regex CardRegex = new(
        @"\b(?:\d[ -]*?){13,19}\b",
        RegexOptions.Compiled);

    private static readonly Regex UrlRegex = new(@"https?://[^\s]+", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly char[] WordSplitChars =
    [
        ' ', '\t', '\n', '\r',
        '.', ',', ';', ':', '!', '?',
        '(', ')', '[', ']', '{', '}',
        '"', '\'', '`',
        '/', '\\', '|',
    ];

    public Task<ModerationResult> ModerateAsync(string text, ModerationContext context, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            return Task.FromResult(ModerationResult.Clean);

        var reasons = new List<ModerationReason>();
        var severity = ModerationSeverity.None;

        // ── Profanity / severe slurs ────────────────────────────────────────────
        var profanityHit = FindProfanity(text);
        if (profanityHit is not null)
        {
            reasons.Add(new ModerationReason("PROFANITY", $"Disallowed term: '{profanityHit}'."));
            severity = Max(severity, ModerationSeverity.High);
        }

        // ── PII (Medium — flag rather than outright block) ──────────────────────
        if (SsnRegex.IsMatch(text))
        {
            reasons.Add(new ModerationReason("PII", "Possible SSN detected."));
            severity = Max(severity, ModerationSeverity.Medium);
        }

        var cardMatch = FindCreditCard(text);
        if (cardMatch is not null)
        {
            reasons.Add(new ModerationReason("PII", "Possible credit card number detected."));
            severity = Max(severity, ModerationSeverity.Medium);
        }

        // ── URL spam ────────────────────────────────────────────────────────────
        var urlMatches = UrlRegex.Matches(text);
        if (urlMatches.Count > 5)
        {
            reasons.Add(new ModerationReason("SPAM", $"Too many links ({urlMatches.Count})."));
            severity = Max(severity, ModerationSeverity.Medium);
        }

        var blockedHit = FindBlockedDomain(urlMatches);
        if (blockedHit is not null)
        {
            reasons.Add(new ModerationReason("SPAM", $"Disallowed link shortener: {blockedHit}."));
            severity = Max(severity, ModerationSeverity.High);
        }

        // ── Gibberish (skip on very short text; use defense-in-depth on Byte / Interview) ──
        if (text.Length >= 20 && IsLikelyGibberish(text))
        {
            reasons.Add(new ModerationReason("GIBBERISH", "Possible gibberish detected."));
            severity = Max(severity, ModerationSeverity.Medium);
        }

        // ── Defense-in-depth length check for long-form contexts ────────────────
        if ((context == ModerationContext.Byte || context == ModerationContext.Interview)
            && text.Trim().Length < 5)
        {
            reasons.Add(new ModerationReason("LENGTH", "Content is too short."));
            severity = Max(severity, ModerationSeverity.Medium);
        }

        if (severity == ModerationSeverity.None)
            return Task.FromResult(ModerationResult.Clean);

        logger.LogDebug("Layer1 flagged content: severity={Severity} reasons={ReasonCount}",
            severity, reasons.Count);

        return Task.FromResult(new ModerationResult(IsClean: false, severity, reasons));
    }

    // ── Profanity ──────────────────────────────────────────────────────────────

    private static string? FindProfanity(string text)
    {
        foreach (var token in Tokenize(text))
        {
            if (Blocklist.Contains(token)) return token;
        }
        return null;
    }

    private static IEnumerable<string> Tokenize(string text)
    {
        foreach (var raw in text.Split(WordSplitChars, StringSplitOptions.RemoveEmptyEntries))
        {
            var lower = raw.ToLowerInvariant();
            if (lower.Length == 0) continue;
            yield return lower;
        }
    }

    // ── Credit card (Luhn) ─────────────────────────────────────────────────────

    private static string? FindCreditCard(string text)
    {
        foreach (Match m in CardRegex.Matches(text))
        {
            var digits = new string(m.Value.Where(char.IsDigit).ToArray());
            if (digits.Length is < 13 or > 19) continue;
            if (PassesLuhn(digits)) return digits;
        }
        return null;
    }

    private static bool PassesLuhn(string digits)
    {
        int sum = 0;
        bool dbl = false;
        for (int i = digits.Length - 1; i >= 0; i--)
        {
            int d = digits[i] - '0';
            if (dbl)
            {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            dbl = !dbl;
        }
        return sum % 10 == 0;
    }

    // ── URL / domain checks ────────────────────────────────────────────────────

    private static string? FindBlockedDomain(MatchCollection urls)
    {
        foreach (Match m in urls)
        {
            if (!Uri.TryCreate(m.Value, UriKind.Absolute, out var uri)) continue;
            var host = uri.Host.ToLowerInvariant();
            if (host.StartsWith("www.")) host = host[4..];
            foreach (var bad in BlockedDomains)
            {
                if (host == bad) return host;
            }
        }
        return null;
    }

    // ── Gibberish heuristic ────────────────────────────────────────────────────

    private static bool IsLikelyGibberish(string text)
    {
        var words = text
            .Split(WordSplitChars, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 3)
            .Select(w => w.ToLowerInvariant())
            .ToArray();

        if (words.Length == 0) return false;

        double totalEntropy = 0;
        int analysed = 0;
        bool vowelStarved = false;

        foreach (var w in words)
        {
            // Letters only — skip tokens that are mostly digits / symbols.
            var letters = new string(w.Where(char.IsLetter).ToArray());
            if (letters.Length < 4) continue;

            totalEntropy += ShannonEntropy(letters);
            analysed++;

            int vowels = letters.Count(c => "aeiouy".Contains(c));
            double vowelRatio = (double)vowels / letters.Length;
            // Long word with effectively no vowels — strong gibberish signal.
            if (letters.Length >= 6 && vowelRatio < 0.1) vowelStarved = true;
        }

        if (analysed == 0) return false;

        double avgEntropy = totalEntropy / analysed;
        // Below 2.5 bits/char is unusually low diversity for English-like text.
        return avgEntropy < 2.5 || vowelStarved;
    }

    private static double ShannonEntropy(string s)
    {
        var counts = new Dictionary<char, int>();
        foreach (var c in s) counts[c] = counts.TryGetValue(c, out var v) ? v + 1 : 1;

        double len = s.Length;
        double h = 0;
        foreach (var k in counts.Values)
        {
            double p = k / len;
            h -= p * Math.Log2(p);
        }
        return h;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static ModerationSeverity Max(ModerationSeverity a, ModerationSeverity b) =>
        (ModerationSeverity)Math.Max((int)a, (int)b);

    /// <summary>
    /// Decode the rot13-stored blocklist to plain text in-memory.
    /// Stored encoded so the source file isn't a list of slurs grep can hit.
    /// </summary>
    private static HashSet<string> BuildBlocklist()
    {
        // ROT13-encoded; decoded at startup. Approx 30 entries — severe slurs and
        // unambiguously offensive terms only. Update with care: never add words
        // that are common substrings of legitimate ones.
        string[] rot13 =
        [
            "avttre", "snttbg", "punax", "phag", "phagf", "fyhg", "fyhgf",
            "jubefba", "jubefbaf", "ovgpu", "ovgpurf", "onfgneq", "qvpx",
            "qvpxf", "chffl", "qlxr", "fcvp", "fcvpf", "puvax", "puvaxf",
            "tbbx", "tbbxf", "xvxr", "xlxr", "envtuneq", "envtuneqf",
            "fxvaxrnq", "gennax", "geraal", "sntf"
        ];

        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var w in rot13) set.Add(Rot13(w));
        return set;
    }

    private static string Rot13(string s)
    {
        var chars = s.ToCharArray();
        for (int i = 0; i < chars.Length; i++)
        {
            char c = chars[i];
            if (c is >= 'a' and <= 'z') chars[i] = (char)(((c - 'a' + 13) % 26) + 'a');
            else if (c is >= 'A' and <= 'Z') chars[i] = (char)(((c - 'A' + 13) % 26) + 'A');
        }
        return new string(chars);
    }
}
