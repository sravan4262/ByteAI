using ByteAI.Core.Infrastructure.AI;
using ByteAI.Core.Services.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Reflection;

namespace ByteAI.Api.Tests.Helpers;

/// <summary>
/// Builds a TechDomainAnchors instance with controllable similarity output for unit tests.
///
/// Two factory methods:
///   AlwaysReject()  → anchors are all-zero vectors; MaxSimilarity returns 0.0 (less than 0.15 threshold) → Stage 2 rejects.
///   AlwaysPass()    → anchors contain a unit vector matching the unit vector the mocked embedding
///                     service returns; MaxSimilarity returns 1.0 → Stage 2 passes.
///
/// The mocked IEmbeddingService must return UnitVector for AlwaysPass() to work.
/// </summary>
public static class TechAnchorsTestHelper
{
    /// <summary>A 768-dim unit vector that produces dot product = 1.0 against itself.</summary>
    public static float[] UnitVector { get; } = CreateUnitVector();

    /// <summary>TechDomainAnchors where MaxSimilarity always returns 0.0 → Stage 2 rejects content.</summary>
    public static TechDomainAnchors AlwaysReject()
    {
        var embedder = CreateZeroEmbedder();
        var anchors = new TechDomainAnchors(embedder);
        // Zero-vector embedder already makes _anchors return all-zero arrays.
        // MaxSimilarity of zero query against zero anchors = 0.0 < 0.15 → reject.
        return anchors;
    }

    /// <summary>TechDomainAnchors where MaxSimilarity always returns 1.0 → Stage 2 passes content.</summary>
    public static TechDomainAnchors AlwaysPass()
    {
        var embedder = CreateZeroEmbedder();
        var anchors = new TechDomainAnchors(embedder);

        // Replace _anchors via reflection with a Lazy that returns our unit vector.
        var field = typeof(TechDomainAnchors)
            .GetField("_anchors", BindingFlags.NonPublic | BindingFlags.Instance)!;

        var unitVec = UnitVector;
        // 10 anchors all equal to UnitVector — MaxSimilarity(UnitVector) = Dot(unit, unit) = 1.0
        var testAnchors = Enumerable.Range(0, 10).Select(_ => unitVec).ToArray();
        field.SetValue(anchors, new Lazy<float[][]>(() => testAnchors));

        return anchors;
    }

    private static float[] CreateUnitVector()
    {
        var vec = new float[768];
        vec[0] = 1.0f;
        return vec;
    }

    private static OnnxEmbedder CreateZeroEmbedder()
    {
        var config = new ConfigurationBuilder().Build(); // no Ai:OnnxModelPath → zero-vector mode
        var logger = NullLogger<OnnxEmbedder>.Instance;
        return new OnnxEmbedder(config, logger);
    }
}
