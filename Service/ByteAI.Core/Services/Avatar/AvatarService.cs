using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace ByteAI.Core.Services.Avatar;

public sealed class AvatarService(
    HttpClient http,
    IConfiguration config,
    ILogger<AvatarService> logger) : IAvatarService
{
    private readonly string _supabaseUrl       = config["Supabase:Url"]              ?? throw new InvalidOperationException("Supabase:Url is not configured");
    private readonly string _serviceRoleKey    = config["Supabase:ServiceRoleKey"]   ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is not configured");
    private readonly string _bucket            = config["Supabase:AvatarBucket"]     ?? "byteAIAvatars";

    public async Task<string> UploadAsync(Guid userId, Stream imageStream, string contentType, CancellationToken ct = default)
    {
        // ── 1. Resize + center-crop to 256×256 WebP ──────────────────────────
        using var image = await Image.LoadAsync(imageStream, ct);

        // Center-crop to square, then resize to 256
        var size = Math.Min(image.Width, image.Height);
        image.Mutate(x => x
            .Crop(new Rectangle((image.Width - size) / 2, (image.Height - size) / 2, size, size))
            .Resize(256, 256));

        using var webpStream = new MemoryStream();
        await image.SaveAsync(webpStream, new WebpEncoder { Quality = 85 }, ct);
        webpStream.Seek(0, SeekOrigin.Begin);

        // ── 2. Upload to Supabase Storage ─────────────────────────────────────
        var path    = $"{userId}/avatar.webp";
        var url     = $"{_supabaseUrl}/storage/v1/object/{_bucket}/{path}";

        using var content = new StreamContent(webpStream);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/webp");

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = content,
        };
        request.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
        request.Headers.Add("x-upsert", "true");

        var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Supabase avatar upload failed: {Status} {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Avatar upload failed: {response.StatusCode}");
        }

        // ── 3. Return public URL ───────────────────────────────────────────────
        return $"{_supabaseUrl}/storage/v1/object/public/{_bucket}/{path}";
    }
}
