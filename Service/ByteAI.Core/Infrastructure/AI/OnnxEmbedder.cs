using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace ByteAI.Core.Infrastructure.AI;

/// <summary>
/// Singleton ONNX embedder for all-MiniLM-L6-v2 (384-dim).
/// Configure Ai:OnnxModelPath in appsettings. If the file is absent the
/// service starts and returns zero-vectors (dev / CI mode).
/// </summary>
public sealed class OnnxEmbedder : IDisposable
{
    public const int Dimensions = 384;
    private const int MaxTokenLength = 128;

    private readonly InferenceSession? _session;
    private readonly ILogger<OnnxEmbedder> _logger;
    private bool _disposed;

    public OnnxEmbedder(IConfiguration config, ILogger<OnnxEmbedder> logger)
    {
        _logger = logger;
        var modelPath = config["Ai:OnnxModelPath"];

        if (!string.IsNullOrEmpty(modelPath) && File.Exists(modelPath))
        {
            var opts = new SessionOptions
            {
                GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL
            };
            _session = new InferenceSession(modelPath, opts);
            _logger.LogInformation("ONNX model loaded from {Path}", modelPath);
        }
        else
        {
            _logger.LogWarning(
                "ONNX model not found at '{Path}'. EmbeddingService returns zero vectors until the model is added.",
                modelPath ?? "<not configured>");
        }
    }

    /// <summary>Returns a normalised 384-dim embedding, or zeros if model not loaded.</summary>
    public float[] Embed(string text)
    {
        if (_session is null) return new float[Dimensions];

        var tokenIds = Tokenize(text);
        var seqLen = Math.Min(tokenIds.Count, MaxTokenLength);

        var inputIds = new DenseTensor<long>(new[] { 1, seqLen });
        var attentionMask = new DenseTensor<long>(new[] { 1, seqLen });
        var tokenTypeIds = new DenseTensor<long>(new[] { 1, seqLen });

        for (int i = 0; i < seqLen; i++)
        {
            inputIds[0, i] = tokenIds[i];
            attentionMask[0, i] = 1L;
            tokenTypeIds[0, i] = 0L;
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIds),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask),
            NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIds),
        };

        using var results = _session.Run(inputs);
        // all-MiniLM-L6-v2 exports last_hidden_state [1, seq, 384] — mean-pool over seq
        var lastHidden = results.First().AsTensor<float>();
        return MeanPool(lastHidden, attentionMask, seqLen);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static float[] MeanPool(Tensor<float> hidden, DenseTensor<long> mask, int seqLen)
    {
        var result = new float[Dimensions];
        int validCount = 0;

        for (int s = 0; s < seqLen; s++)
        {
            if (mask[0, s] == 0) continue;
            validCount++;
            for (int d = 0; d < Dimensions; d++)
                result[d] += hidden[0, s, d];
        }

        if (validCount > 0)
            for (int d = 0; d < Dimensions; d++)
                result[d] /= validCount;

        return NormalizeL2(result);
    }

    private static float[] NormalizeL2(float[] v)
    {
        float norm = (float)Math.Sqrt(v.Sum(x => x * x));
        if (norm > 1e-9f)
            for (int i = 0; i < v.Length; i++)
                v[i] /= norm;
        return v;
    }

    /// <summary>
    /// Stub tokenizer — maps words to IDs via hash mod vocab-size.
    /// Replace with BertTokenizer.Create(vocabPath) once the vocab file is bundled.
    /// Special tokens: [CLS]=101, [SEP]=102, [UNK]=100.
    /// </summary>
    private static List<long> Tokenize(string text)
    {
        const long CLS = 101L, SEP = 102L;
        const int VocabSize = 28000, IdOffset = 1000;

        var ids = new List<long> { CLS };
        foreach (var word in text.ToLowerInvariant()
                     .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            ids.Add((Math.Abs((long)word.GetHashCode()) % VocabSize) + IdOffset);
        }
        ids.Add(SEP);
        return ids;
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _session?.Dispose();
            _disposed = true;
        }
    }
}
