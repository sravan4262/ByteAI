using ByteAI.Core.Infrastructure.AI;

namespace ByteAI.Core.Services.AI;

/// <summary>
/// Singleton that pre-computes embeddings for tech domain anchor phrases.
/// Used to score how "tech-related" submitted content is via cosine similarity.
/// Lazy-initialised so the ONNX model is fully loaded before first use.
/// </summary>
public sealed class TechDomainAnchors
{
    private static readonly string[] Phrases =
    [
        "software development and programming",
        "cloud infrastructure and devops",
        "machine learning and artificial intelligence",
        "system design and software architecture",
        "databases and data engineering",
        "cybersecurity and networking",
        "web and mobile development",
        "algorithms and data structures",
        "developer tools and version control",
        "open source and software engineering"
    ];

    private readonly Lazy<float[][]> _anchors;

    public TechDomainAnchors(OnnxEmbedder embedder)
    {
        // Lazy: computed once on first access, after the ONNX model warms up.
        _anchors = new Lazy<float[][]>(() =>
            Phrases.Select(p => embedder.EmbedDocument(p)).ToArray());
    }

    /// <summary>
    /// Returns the highest cosine similarity between <paramref name="queryEmbedding"/>
    /// and any tech domain anchor. Range: -1 to 1 (higher = more tech-related).
    /// nomic embeddings are L2-normalised, so dot product == cosine similarity.
    /// </summary>
    public float MaxSimilarity(float[] queryEmbedding)
    {
        var anchors = _anchors.Value;
        var max = float.MinValue;
        foreach (var anchor in anchors)
        {
            var dot = DotProduct(queryEmbedding, anchor);
            if (dot > max) max = dot;
        }
        return max;
    }

    private static float DotProduct(float[] a, float[] b)
    {
        float sum = 0f;
        var len = Math.Min(a.Length, b.Length);
        for (var i = 0; i < len; i++) sum += a[i] * b[i];
        return sum;
    }
}
