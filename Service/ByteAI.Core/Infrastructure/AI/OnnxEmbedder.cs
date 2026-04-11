using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Microsoft.ML.Tokenizers;

namespace ByteAI.Core.Infrastructure.AI;

/// <summary>
/// Singleton ONNX embedder for nomic-embed-text-v1.5 (768-dim, 8192-token context).
///
/// Required config keys:
///   Ai:OnnxModelPath  — path to nomic-embed-text-v1.5.onnx
///   Ai:VocabPath      — path to vocab.txt (standard BERT WordPiece vocab)
///
/// If either file is absent the service starts in zero-vector mode (dev / CI).
///
/// nomic-embed-text-v1.5 requires task-type prefixes for best quality:
///   Documents (bytes, interviews stored in DB) → "search_document: <text>"
///   Queries   (search input, duplicate check)   → "search_query: <text>"
/// </summary>
public sealed class OnnxEmbedder : IDisposable
{
    public const int Dimensions = 768;
    private const int MaxTokenLength = 512;

    private const string DocumentPrefix = "search_document: ";
    private const string QueryPrefix    = "search_query: ";

    private readonly InferenceSession? _session;
    private readonly BertTokenizer?    _tokenizer;
    private readonly ILogger<OnnxEmbedder> _logger;
    private bool _disposed;

    public OnnxEmbedder(IConfiguration config, ILogger<OnnxEmbedder> logger)
    {
        _logger = logger;

        var modelPath = config["Ai:OnnxModelPath"];
        var vocabPath = config["Ai:VocabPath"];

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
                "ONNX model not found at '{Path}'. Embedder returns zero vectors until model is added.",
                modelPath ?? "<not configured>");
        }

        if (!string.IsNullOrEmpty(vocabPath) && File.Exists(vocabPath))
        {
            _tokenizer = BertTokenizer.Create(vocabPath, new BertOptions { LowerCaseBeforeTokenization = true });
            _logger.LogInformation("BertTokenizer loaded from {Path}", vocabPath);
        }
        else
        {
            _logger.LogWarning(
                "Vocab file not found at '{Path}'. Using stub tokenizer — embeddings will be low quality.",
                vocabPath ?? "<not configured>");
        }
    }

    /// <summary>Embed a document for storage (byte body, interview content, user interests).</summary>
    public float[] EmbedDocument(string text) => RunEmbed(DocumentPrefix + text);

    /// <summary>Embed a search query or duplicate-check input.</summary>
    public float[] EmbedQuery(string text) => RunEmbed(QueryPrefix + text);

    // ── Private ──────────────────────────────────────────────────────────────

    private float[] RunEmbed(string prefixedText)
    {
        if (_session is null) return new float[Dimensions];

        var tokenIds = Tokenize(prefixedText);
        var seqLen   = Math.Min(tokenIds.Count, MaxTokenLength);

        var inputIds      = new DenseTensor<long>(new[] { 1, seqLen });
        var attentionMask = new DenseTensor<long>(new[] { 1, seqLen });
        var tokenTypeIds  = new DenseTensor<long>(new[] { 1, seqLen });

        for (int i = 0; i < seqLen; i++)
        {
            inputIds[0, i]      = tokenIds[i];
            attentionMask[0, i] = 1L;
            tokenTypeIds[0, i]  = 0L;
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids",      inputIds),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask),
            NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIds),
        };

        using var results   = _session.Run(inputs);
        var lastHidden       = results.First().AsTensor<float>();
        return MeanPool(lastHidden, attentionMask, seqLen);
    }

    private List<long> Tokenize(string text)
    {
        if (_tokenizer is not null)
        {
            // Real BertTokenizer — uses BERT WordPiece vocab, adds [CLS] and [SEP]
            var ids = _tokenizer.EncodeToIds(text, MaxTokenLength, out _, out _);
            return ids.Select(id => (long)id).ToList();
        }

        // Fallback stub — hashes words to IDs. Works but produces low-quality vectors.
        // Replace by providing a valid vocab.txt (Ai:VocabPath in appsettings).
        return StubTokenize(text);
    }

    private static List<long> StubTokenize(string text)
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

    private static float[] MeanPool(Tensor<float> hidden, DenseTensor<long> mask, int seqLen)
    {
        var result     = new float[Dimensions];
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

    public void Dispose()
    {
        if (!_disposed)
        {
            _session?.Dispose();
            _disposed = true;
        }
    }
}
