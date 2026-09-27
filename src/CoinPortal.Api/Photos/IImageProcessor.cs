namespace CoinPortal.Api.Photos;

/// <summary>
/// Turns an uploaded image into the stored renditions. This is the only place that depends on
/// an image library; replacing the library means writing another implementation of this
/// interface and changing its registration in Program.cs.
///
/// Contract every implementation must follow:
/// - The source stream is seekable and positioned at 0 (the caller buffers the upload).
/// - Accept only JPEG and PNG, detected from the content (never from file name or content type).
/// - Reject sources wider or taller than <see cref="PhotoOptions.MaxSourceDimension"/> before
///   decoding the pixels.
/// - Apply the EXIF orientation, then crop to a centered square if the source is not square.
/// - Return one lossy WebP per <see cref="PhotoSize"/> at <see cref="PhotoSizes.Pixels"/>
///   (Full: never upscaled beyond the source), with <see cref="PhotoOptions.WebpQuality"/>.
/// - Output carries no metadata (EXIF, GPS, ICC, XMP).
/// - Throw <see cref="InvalidImageException"/> for anything that is not an acceptable image.
/// </summary>
public interface IImageProcessor
{
    Task<IReadOnlyDictionary<PhotoSize, byte[]>> ProcessAsync(Stream source, CancellationToken ct);
}

/// <summary>The upload is not a supported or valid image. The message is safe to show.</summary>
public class InvalidImageException(string message, Exception? inner = null) : Exception(message, inner);
