using System.Text.RegularExpressions;
using Serilog.Core;
using Serilog.Events;

namespace ByteAI.Api.Logging;

/// <summary>
/// Redacts sensitive query-string values from any string property on a log event.
///
/// SignalR's SSE / long-polling fallback transports send the JWT as <c>?access_token=...</c>,
/// and OAuth callbacks carry <c>?code=...&amp;state=...</c>. If anything (a future enricher,
/// an exception's stack trace, an exception's <c>RequestUrl</c> property) ends up logging the
/// full URL, those values would land in log storage. This enricher strips them in place.
/// </summary>
public sealed class RedactSensitiveQueryEnricher : ILogEventEnricher
{
    private static readonly Regex Pattern = new(
        @"(?<=[?&])(access_token|code|state)=[^&\s""'<>]+",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        foreach (var kvp in logEvent.Properties.ToList())
        {
            if (kvp.Value is ScalarValue { Value: string s } && Pattern.IsMatch(s))
            {
                var redacted = Pattern.Replace(s, m => $"{m.Groups[1].Value}=REDACTED");
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty(kvp.Key, redacted));
            }
        }
    }
}
