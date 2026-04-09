using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ByteAI.Core.Services.AI;

public sealed class GroqService(HttpClient http, IConfiguration config, ILogger<GroqService> logger) : IGroqService
{
    private const string Model = "llama-3.3-70b-versatile";
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public async Task<List<string>> SuggestTagsAsync(string title, string body, string? codeSnippet, CancellationToken ct = default)
    {
        var content = string.IsNullOrEmpty(codeSnippet)
            ? $"Title: {title}\n\n{body}"
            : $"Title: {title}\n\n{body}\n\nCode:\n{codeSnippet}";

        var prompt = $"""
            You are a tech content tagger. Given the following content, return ONLY a JSON array of 3-5 lowercase
            hyphenated tags (e.g. ["react","performance","web-vitals"]). No explanation.

            Content:
            {content}
            """;

        var raw = await ChatAsync(prompt, maxTokens: 100, ct);
        if (string.IsNullOrEmpty(raw)) return [];

        try
        {
            // Extract JSON array from response
            var start = raw.IndexOf('[');
            var end = raw.LastIndexOf(']');
            if (start < 0 || end < 0) return [];

            var tags = JsonSerializer.Deserialize<List<string>>(raw[start..(end + 1)], JsonOpts) ?? [];
            return tags.Take(5).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse tag suggestions from Groq response: {Raw}", raw);
            return [];
        }
    }

    public async Task<string> AskAsync(string question, string? context, CancellationToken ct = default)
    {
        var prompt = string.IsNullOrEmpty(context)
            ? $"Answer this tech question concisely:\n\n{question}"
            : $"""
               Answer the question using the provided context. Be concise and technical.

               Context:
               {context}

               Question: {question}
               """;

        return await ChatAsync(prompt, maxTokens: 500, ct) ?? "Sorry, I couldn't generate a response.";
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private async Task<string?> ChatAsync(string prompt, int maxTokens, CancellationToken ct)
    {
        var apiKey = config["Ai:GroqApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogWarning("Ai:GroqApiKey is not configured. Skipping Groq request.");
            return null;
        }

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        request.Content = JsonContent.Create(new
        {
            model = Model,
            messages = new[] { new { role = "user", content = prompt } },
            max_tokens = maxTokens,
            temperature = 0.3
        });

        try
        {
            var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Groq API call failed");
            return null;
        }
    }
}
