using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ByteAI.Core.Services.AI;

public sealed class GroqService(
    HttpClient http,
    IConfiguration config,
    ILogger<GroqService> logger,
    GroqLoadBalancer balancer) : IGroqService
{
    private const string SubdomainList =
        "be_languages, be_frameworks, api_protocols, queues_cache, " +
        "ui_frameworks, meta_frameworks, styling, build_tools, fe_testing, " +
        "cloud_providers, containers, cicd, iac, observability, " +
        "ios, android, cross_platform, " +
        "ml_frameworks, nlp_llms, mlops, data_science, " +
        "data_databases, data_warehouses, data_processing, data_viz, " +
        "appsec, cloud_security, cryptography, pentesting, " +
        "sys_languages, embedded, os_kernel, networking, " +
        "evm, non_evm, web3_tools, smart_contracts, " +
        "game_engines, graphics, game_languages";

    public async Task<List<TagSuggestion>> SuggestTagsAsync(string title, string body, string? codeSnippet, CancellationToken ct = default)
    {
        var content = string.IsNullOrEmpty(codeSnippet)
            ? $"Title: {title}\n\n{body}"
            : $"Title: {title}\n\n{body}\n\nCode:\n{codeSnippet}";

        var prompt = $$"""
            You are a tech content tagger. Suggest up to 5 relevant tech stack tags for the content below, ranked most to least relevant.
            For each tag, classify which subdomain it belongs to from the SUBDOMAIN LIST.
            Tag names must be lowercase snake_case (e.g. javascript, node_js, react, postgresql).
            Return ONLY a JSON array of objects. No explanation, no markdown.

            Format: [{"tag":"javascript","subdomain":"be_languages"}]

            SUBDOMAIN LIST: {{SubdomainList}}

            Content:
            {{content}}
            """;

        var raw = await ChatAsync(prompt, maxTokens: 200, ct);
        if (string.IsNullOrEmpty(raw)) return [];

        try
        {
            var start = raw.IndexOf('[');
            var end = raw.LastIndexOf(']');
            if (start < 0 || end < 0) return [];

            using var doc = JsonDocument.Parse(raw[start..(end + 1)]);
            return doc.RootElement.EnumerateArray()
                .Select(el => new TagSuggestion(
                    el.GetProperty("tag").GetString() ?? "",
                    el.GetProperty("subdomain").GetString() ?? ""))
                .Where(s => !string.IsNullOrWhiteSpace(s.Tag) && !string.IsNullOrWhiteSpace(s.Subdomain))
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse tag suggestions from Groq response: {Raw}", raw);
            return [];
        }
    }

    public async Task<QualityScore?> ScoreQualityAsync(string title, string body, CancellationToken ct = default)
    {
        var prompt = $$"""
            Rate this tech post on three dimensions. Return ONLY valid JSON, no explanation.

            Title: {{title}}
            Body: {{body}}

            Return JSON in this exact shape (replace angle brackets with integers 1-10):
            clarity: how readable and well-structured it is.
            specificity: how concrete and actionable it is.
            relevance: how well the title matches the body.
            Example output: {"clarity":8,"specificity":7,"relevance":9}
            """;

        var raw = await ChatAsync(prompt, maxTokens: 60, ct);
        if (string.IsNullOrEmpty(raw)) return null;

        try
        {
            var start = raw.IndexOf('{');
            var end = raw.LastIndexOf('}');
            if (start < 0 || end < 0) return null;

            using var doc = JsonDocument.Parse(raw[start..(end + 1)]);
            var root = doc.RootElement;
            return new QualityScore(
                root.GetProperty("clarity").GetInt32(),
                root.GetProperty("specificity").GetInt32(),
                root.GetProperty("relevance").GetInt32());
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse quality score from Groq response: {Raw}", raw);
            return null;
        }
    }

    public async Task<string> RagAnswerAsync(string question, IReadOnlyList<RagPassage> passages, CancellationToken ct = default)
    {
        if (passages.Count == 0)
            return await AskAsync(question, null, ct);

        var contextBlock = string.Join("\n\n---\n\n", passages.Select((p, i) =>
            $"[{i + 1}] {p.Title}\n{p.Body}"));

        var prompt = $"""
            You are a technical assistant. Answer the question using ONLY the provided context passages.
            Be concise, accurate, and cite passage numbers like [1] or [2] when referencing them.
            If the context doesn't contain enough information, say so briefly.

            Context:
            {contextBlock}

            Question: {question}
            """;

        return await ChatAsync(prompt, maxTokens: 600, ct) ?? "Sorry, I couldn't generate a response.";
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

    public async Task<ContentValidationResult?> ValidateTechContentAsync(string title, string body, CancellationToken ct = default)
    {
        var schema = """{"isTechRelated": true|false, "isCoherent": true|false, "reason": "max 20 words"}""";
        var prompt = $"""
            You are validating posts for a tech content platform.

            Respond ONLY with valid JSON, no explanation. Return exactly: {schema}

            Rules:
            - isTechRelated: true if the content mentions any technology, programming language, framework, tool, concept, company, or practice (e.g. ".NET", "React", "Kubernetes", "CI/CD"). Be generous.
            - isCoherent: false ONLY if the content is random keyboard mashing or completely unintelligible. A short tech term, a name, or a brief sentence is coherent.
            - reason: one short phrase explaining your decision.

            Title: {title}
            Body: {body}
            """;

        var raw = await ChatAsync(prompt, maxTokens: 80, ct);
        if (string.IsNullOrEmpty(raw)) return null; // fail open — don't block if Groq is down

        try
        {
            var start = raw.IndexOf('{');
            var end = raw.LastIndexOf('}');
            if (start < 0 || end < 0) return null;

            using var doc = JsonDocument.Parse(raw[start..(end + 1)]);
            var root = doc.RootElement;
            return new ContentValidationResult(
                root.GetProperty("isTechRelated").GetBoolean(),
                root.GetProperty("isCoherent").GetBoolean(),
                root.GetProperty("reason").GetString() ?? "");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse tech content validation from Groq: {Raw}", raw);
            return null; // fail open
        }
    }

    public async Task<string> FormatCodeAsync(string code, string language, CancellationToken ct = default)
    {
        var prompt = $"""
            Format the following {language} code according to standard style conventions.
            Return ONLY the formatted code — no explanation, no markdown fences, no extra text.

            {code}
            """;

        return await ChatAsync(prompt, maxTokens: 2000, ct) ?? code;
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private async Task<string?> ChatAsync(string prompt, int maxTokens, CancellationToken ct)
    {
        var apiKey = config["Groq:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogWarning("Groq:ApiKey is not configured. Skipping Groq request.");
            return null;
        }

        if (!balancer.IsAvailable)
        {
            logger.LogWarning("Both Groq models RPD-exhausted. Dropping request until UTC midnight.");
            return null;
        }

        return await SendAsync(prompt, maxTokens, balancer.GetModel(), isRetry: false, apiKey, ct);
    }

    private async Task<string?> SendAsync(
        string prompt, int maxTokens, string model, bool isRetry, string apiKey, CancellationToken ct)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = JsonContent.Create(new
        {
            model,
            messages = new[] { new { role = "user", content = prompt } },
            max_tokens = maxTokens,
            temperature = 0.3
        });

        try
        {
            var response = await http.SendAsync(request, ct);

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                var isRpd = body.Contains("per_day", StringComparison.OrdinalIgnoreCase);

                if (isRpd)
                {
                    balancer.RecordRpd(model);
                    if (!isRetry && balancer.IsAvailable)
                    {
                        logger.LogWarning("Groq RPD hit on {Model}. Retrying with fallback model.", model);
                        return await SendAsync(prompt, maxTokens, balancer.GetModel(), isRetry: true, apiKey, ct);
                    }
                    logger.LogError("Both Groq models RPD-exhausted. Request dropped.");
                    return null;
                }

                // per_minute — transient, switch model for this retry only
                if (!isRetry)
                {
                    var fallback = balancer.GetFallback(model);
                    logger.LogWarning("Groq RPM hit on {Model}. Retrying with {Fallback}.", model, fallback);
                    return await SendAsync(prompt, maxTokens, fallback, isRetry: true, apiKey, ct);
                }

                // Both RPM-blocked simultaneously — drop rather than blocking thread for 60s
                logger.LogWarning("Both Groq models RPM-blocked. Dropping request.");
                return null;
            }

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
            logger.LogError(ex, "Groq API call failed for model {Model}", model);
            return null;
        }
    }
}
