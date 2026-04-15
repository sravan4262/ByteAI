using ByteAI.Core.Infrastructure.AI;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ByteAI.Api.HealthChecks;

/// <summary>
/// Verifies the ONNX embedder loaded the model file successfully.
/// Returns Unhealthy when the embedder is in zero-vector fallback mode,
/// which means the model file was not found at the configured path.
/// In production the model is baked into the Docker image, so this
/// should always be Healthy.
/// </summary>
public sealed class OnnxModelHealthCheck(OnnxEmbedder embedder) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var result = embedder.IsModelLoaded
            ? HealthCheckResult.Healthy("ONNX model loaded (nomic-embed-text-v1.5)")
            : HealthCheckResult.Unhealthy("ONNX model not loaded — embedder is in zero-vector mode. Check Ai:OnnxModelPath config.");

        return Task.FromResult(result);
    }
}
