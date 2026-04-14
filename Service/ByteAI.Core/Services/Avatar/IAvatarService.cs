namespace ByteAI.Core.Services.Avatar;

public interface IAvatarService
{
    /// <summary>
    /// Resize, crop to square, convert to WebP, upload to Supabase Storage,
    /// and return the public URL. Overwrites any previous file for this user.
    /// </summary>
    Task<string> UploadAsync(Guid userId, Stream imageStream, string contentType, CancellationToken ct = default);
}
