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
            await DeleteFolderAsync(temp);
            throw;
        }
    }

    public Stream? OpenRead(string ownerId, Guid imageId, string fileName)
    {
        var path = Path.Combine(ImageFolder(ownerId, imageId), SafeFileName(fileName));
        try
        {
            // FileShare.Delete: a photo being served does not block deleting it (on Windows an
            // account deletion would otherwise leave the folder behind)
            return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete,
                bufferSize: 64 * 1024, useAsync: true);
        }
        catch (Exception e) when (e is FileNotFoundException or DirectoryNotFoundException)
        {
            return null;
        }
    }

    public Task DeleteAsync(string ownerId, Guid imageId) => DeleteFolderAsync(ImageFolder(ownerId, imageId));

    public Task DeleteOwnerAsync(string ownerId) => DeleteFolderAsync(OwnerFolder(ownerId));

    public async Task<string> CheckWritableAsync()
    {
        Directory.CreateDirectory(root);
        var probe = Path.Combine(root, $".write-test-{Guid.NewGuid():N}");
        await File.WriteAllTextAsync(probe, "ok");
        File.Delete(probe);
        return root;
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

    // Waits between attempts: a virus scanner or a backup may hold a file for a moment
    private static readonly TimeSpan[] RetryDelays = [TimeSpan.FromMilliseconds(200), TimeSpan.FromSeconds(1)];

    // Never throws: the database is the source of truth and its rows are already gone. A folder
    // left behind holds personal data the user was told is deleted, so it is an error in the log
    // (with the path, to remove it by hand)
    private async Task DeleteFolderAsync(string path)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, recursive: true);
                }
                return;
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                if (attempt == RetryDelays.Length)
                {
                    logger.LogError(e, "Could not delete photo folder {Path}", path);
                    return;
                }
                await Task.Delay(RetryDelays[attempt]);
            }
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
