using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace CoinPortal.Api.Photos;

/// <summary>
/// <see cref="IImageProcessor"/> on SixLabors ImageSharp (fully managed, no native binaries).
/// The only file that references ImageSharp.
/// </summary>
public class ImageSharpImageProcessor(IOptions<PhotoOptions> options) : IImageProcessor
{
    private readonly PhotoOptions options = options.Value;

    private static readonly DecoderOptions Decoder = new()
    {
        MaxFrames = 1,
        // Convert embedded color profiles to sRGB, since the output carries no profile
        ColorProfileHandling = ColorProfileHandling.Convert,
    };

    public async Task<IReadOnlyDictionary<PhotoSize, byte[]>> ProcessAsync(Stream source, CancellationToken ct)
    {
        try
        {
            // Header only: format and dimensions are checked before any pixel is decoded
            var info = await Image.IdentifyAsync(Decoder, source, ct);
            var format = info.Metadata.DecodedImageFormat;
            if (format is not (JpegFormat or PngFormat))
            {
                throw new InvalidImageException("Only JPEG and PNG images are supported.");
            }
            if (info.Width > options.MaxSourceDimension || info.Height > options.MaxSourceDimension)
            {
                throw new InvalidImageException(
                    $"The image must not be larger than {options.MaxSourceDimension} pixels on either side.");
            }

            source.Position = 0;
            using var image = await Image.LoadAsync(Decoder, source, ct);

            // Orientation first, it decides which part a centered square crop keeps
            image.Mutate(x => x.AutoOrient());

            var side = Math.Min(image.Width, image.Height);
            if (side < PhotoSize.Thumb.Pixels())
            {
                throw new InvalidImageException(
                    $"The image must be at least {PhotoSize.Thumb.Pixels()} pixels on each side.");
            }
            if (image.Width != image.Height)
            {
                image.Mutate(x => x.Crop(new Rectangle(
                    (image.Width - side) / 2, (image.Height - side) / 2, side, side)));
            }

            // No metadata in the output (EXIF may contain GPS coordinates)
            image.Metadata.ExifProfile = null;
            image.Metadata.IccProfile = null;
            image.Metadata.XmpProfile = null;
            image.Metadata.IptcProfile = null;
            image.Metadata.CicpProfile = null;

            var encoder = new WebpEncoder
            {
                FileFormat = WebpFileFormatType.Lossy,
                Quality = options.WebpQuality,
            };

            var result = new Dictionary<PhotoSize, byte[]>();
            foreach (var size in PhotoSizes.All)
            {
                var pixels = size == PhotoSize.Full ? Math.Min(size.Pixels(), side) : size.Pixels();
                using var resized = image.Clone(x => x.Resize(pixels, pixels));
                using var output = new MemoryStream();
                await resized.SaveAsync(output, encoder, ct);
                result[size] = output.ToArray();
            }
            return result;
        }
        catch (Exception e) when (e is UnknownImageFormatException or InvalidImageContentException
                                      or ImageFormatException)
        {
            throw new InvalidImageException("The file is not a valid image.", e);
        }
    }
}
