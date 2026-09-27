using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Photos;

/// <summary>
/// Stores photos in a folder on disk (PhotoStorage:RootPath). New photos are written to a
/// temporary folder under the root and then moved into place, so readers never see a
/// half-written photo and a failed upload leaves nothing behind.
/// </summary>
public partial class FileSystemPhotoStorage : IPhotoStorage
{
    private const string TempFolderName = ".tmp";

    private readonly string root;
    private readonly ILogger<FileSystemPhotoStorage> logger;

    public FileSystemPhotoStorage(
        IOptions<PhotoOptions> options, IHostEnvironment env, ILogger<FileSystemPhotoStorage> logger)
    {
        root = Path.GetFullPath(Path.Combine(env.ContentRootPath, options.Value.RootPath));
        this.logger = logger;
    }

    public async Task SaveAsync(string ownerId, Guid imageId, IReadOnlyDictionary<string, byte[]> files,
        CancellationToken ct)
    {
        var target = ImageFolder(ownerId, imageId);
        var temp = Path.Combine(root, TempFolderName, Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(temp);
        try
        {
            foreach (var (fileName, bytes) in files)
            {
                await File.WriteAllBytesAsync(Path.Combine(temp, SafeFileName(fileName)), bytes, ct);
            }

            Directory.CreateDirectory(OwnerFolder(ownerId));
            // Same volume as the target, so this is a rename
            Directory.Move(temp, target);
        }
        catch
        {
            TryDeleteFolder(temp);
            throw;
        }
    }

    public Stream? OpenRead(string ownerId, Guid imageId, string fileName)
    {
        var path = Path.Combine(ImageFolder(ownerId, imageId), SafeFileName(fileName));
        try
        {
            return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read,
                bufferSize: 64 * 1024, useAsync: true);
        }
        catch (Exception e) when (e is FileNotFoundException or DirectoryNotFoundException)
        {
            return null;
        }
    }

    public Task DeleteAsync(string ownerId, Guid imageId)
    {
        TryDeleteFolder(ImageFolder(ownerId, imageId));
        return Task.CompletedTask;
    }

    public Task DeleteOwnerAsync(string ownerId)
    {
        TryDeleteFolder(OwnerFolder(ownerId));
        return Task.CompletedTask;
    }

    private string OwnerFolder(string ownerId)
    {
        // Identity ids are GUID strings; anything else could escape the root folder
        if (!SafeSegment().IsMatch(ownerId))
        {
            throw new ArgumentException("Invalid owner id.", nameof(ownerId));
        }
        return Path.Combine(root, ownerId);
    }

    private string ImageFolder(string ownerId, Guid imageId) =>
        Path.Combine(OwnerFolder(ownerId), imageId.ToString("N"));

    // File deletion is best effort: the database is the source of truth, a leftover folder
    // only costs disk space and is logged
    private void TryDeleteFolder(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(e, "Could not delete photo folder {Path}", path);
        }
    }

    // Only names this code creates (thumb.webp, cover.webp), never a path
    private static string SafeFileName(string fileName) =>
        SafeFile().IsMatch(fileName) ? fileName : throw new ArgumentException("Invalid file name.", nameof(fileName));

    [GeneratedRegex("^[A-Za-z0-9-]{1,64}$")]
    private static partial Regex SafeSegment();

    [GeneratedRegex(@"^[a-z0-9]{1,32}\.webp$")]
    private static partial Regex SafeFile();
}
