using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Microsoft.ML.Tokenizers;
using System.Diagnostics;
using System.Text.RegularExpressions;

// ── Config ────────────────────────────────────────────────────────────────────
var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json")
    .Build();

using var loggerFactory = LoggerFactory.Create(b => b.AddConsole().SetMinimumLevel(LogLevel.Warning));

// ── Load ONNX model ───────────────────────────────────────────────────────────
var cwd       = Directory.GetCurrentDirectory();
var modelPath = Path.GetFullPath(Path.Combine(cwd, config["Ai:OnnxModelPath"]!));
var vocabPath = Path.GetFullPath(Path.Combine(cwd, config["Ai:VocabPath"]!));

if (!File.Exists(modelPath))
{
    Console.Error.WriteLine($"ERROR: ONNX model not found at: {modelPath}");
    Console.Error.WriteLine("Update Ai:OnnxModelPath in appsettings.json");
    return 1;
}
if (!File.Exists(vocabPath))
{
    Console.Error.WriteLine($"ERROR: Vocab not found at: {vocabPath}");
    Console.Error.WriteLine("Update Ai:VocabPath in appsettings.json");
    return 1;
}

const int Dims         = 768;
const int MaxTokens    = 512;
const string DocPrefix = "search_document: ";

var sessionOpts = new SessionOptions { GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL };
var session     = new InferenceSession(modelPath, sessionOpts);
var tokenizer   = BertTokenizer.Create(vocabPath, new BertOptions { LowerCaseBeforeTokenization = true });

Console.WriteLine($"Model loaded ({Dims}-dim). Starting re-embed of seed files...");
Console.WriteLine();

float[] Embed(string text)
{
    var prefixed = DocPrefix + text;
    var ids      = tokenizer.EncodeToIds(prefixed, MaxTokens, out _, out _)
                            .Select(id => (long)id).ToList();
    var seqLen   = Math.Min(ids.Count, MaxTokens);

    var inputIds      = new DenseTensor<long>(new[] { 1, seqLen });
    var attentionMask = new DenseTensor<long>(new[] { 1, seqLen });
    var tokenTypeIds  = new DenseTensor<long>(new[] { 1, seqLen });

    for (int i = 0; i < seqLen; i++)
    {
        inputIds[0, i]      = ids[i];
        attentionMask[0, i] = 1L;
        tokenTypeIds[0, i]  = 0L;
    }

    var inputs = new List<NamedOnnxValue>
    {
        NamedOnnxValue.CreateFromTensor("input_ids",      inputIds),
        NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask),
        NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIds),
    };

    using var results = session.Run(inputs);
    var hidden        = results.First().AsTensor<float>();

    var vec        = new float[Dims];
    int validCount = 0;
    for (int s = 0; s < seqLen; s++)
    {
        validCount++;
        for (int d = 0; d < Dims; d++) vec[d] += hidden[0, s, d];
    }
    if (validCount > 0)
        for (int d = 0; d < Dims; d++) vec[d] /= validCount;

    var norm = (float)Math.Sqrt(vec.Sum(x => x * x));
    if (norm > 1e-9f)
        for (int d = 0; d < Dims; d++) vec[d] /= norm;

    return vec;
}

// ── Seeds directory ───────────────────────────────────────────────────────────
var seedsDir = Path.GetFullPath(Path.Combine(cwd, config["SeedsDir"]!));
if (!Directory.Exists(seedsDir))
{
    Console.Error.WriteLine($"ERROR: Seeds directory not found: {seedsDir}");
    return 1;
}

var sqlFiles = Directory.GetFiles(seedsDir, "*-seed.sql").OrderBy(f => f).ToArray();
Console.WriteLine($"Found {sqlFiles.Length} seed files → {seedsDir}");
Console.WriteLine();

var escapeRx = new Regex(@"\$escape\$(.*?)\$escape\$", RegexOptions.Singleline | RegexOptions.Compiled);
var vectorRx = new Regex(@"'(\[[-\d.,eE ]+\])'::vector", RegexOptions.Compiled);
var insertRx = new Regex(@"INSERT\s+INTO\s+bytes\.bytes\b.*?\)\s+ON\s+CONFLICT\s+DO\s+NOTHING;", RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

int totalFiles = 0, totalBytes = 0, skipped = 0;
var sw = Stopwatch.StartNew();

for (int fi = 0; fi < sqlFiles.Length; fi++)
{
    var filePath  = sqlFiles[fi];
    var fileName  = Path.GetFileName(filePath);
    var content   = File.ReadAllText(filePath);
    int fileBytesEmbedded = 0;

    Console.Write($"\r  [{fi + 1,3}/{sqlFiles.Length}] {fileName,-45} ...");

    var updated = insertRx.Replace(content, m =>
    {
        var insert = m.Value;
        var groups = escapeRx.Matches(insert);

        if (groups.Count < 2)
        {
            skipped++;
            return insert;
        }

        var title  = groups[0].Groups[1].Value.Trim();
        var body   = groups[1].Groups[1].Value.Trim();
        var vec    = Embed(title + " " + body);
        var vecStr = "[" + string.Join(",", vec.Select(v => v.ToString("G7"))) + "]";

        fileBytesEmbedded++;
        return vectorRx.Replace(insert, $"'{vecStr}'::vector");
    });

    if (fileBytesEmbedded > 0)
    {
        File.WriteAllText(filePath, updated);
        totalFiles++;
        totalBytes += fileBytesEmbedded;
    }

    Console.Write($"\r  [{fi + 1,3}/{sqlFiles.Length}] {fileName,-45} {fileBytesEmbedded,3} embedded  {sw.Elapsed:m\\:ss}");
    Console.WriteLine();
}

Console.WriteLine();
Console.WriteLine($"Finished in {sw.Elapsed:m\\:ss}");
Console.WriteLine($"  Files updated      : {totalFiles}");
Console.WriteLine($"  Bytes re-embedded  : {totalBytes}");
if (skipped > 0)
    Console.WriteLine($"  Skipped (parse err): {skipped}");

// Suppress known ONNX Runtime macOS native mutex crash on process exit
try { session.Dispose(); } catch { }

return 0;
