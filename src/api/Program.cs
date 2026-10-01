using CoinPortal.Api.Accounts;
using CoinPortal.Api.Authorization;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
using CoinPortal.Api.DevData;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Hosting;

// Our own switch is removed so the configuration command-line parser never sees it
var seedDevData = args.Contains(DevDataSeeder.CommandLineSwitch);
var builder = WebApplication.CreateBuilder(
    args.Where(a => a != DevDataSeeder.CommandLineSwitch).ToArray());

// Logging (Serilog), data protection keys, rate limits: Hosting/
builder.Services.AddAppLogging();
builder.Services.AddAppDataProtection();
builder.Services.AddAppRateLimiting();

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity (users + roles) backed by EF Core
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;

        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;

        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);

        // No '@' in usernames, so login can tell username and email apart
        options.User.AllowedUserNameCharacters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-";
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// The cookie is checked against the database this often (default 30 minutes): role changes and
// security stamp changes (e.g. a locked account) reach signed-in users within a minute
builder.Services.Configure<SecurityStampValidatorOptions>(options =>
    options.ValidationInterval = TimeSpan.FromMinutes(1));

// Admin role: granted from configuration only (Admin:UserIds), synced at startup
builder.Services.AddOptions<AdminOptions>().Bind(builder.Configuration.GetSection(AdminOptions.SectionName));
builder.Services.AddScoped<AdminRoleSync>();
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthPolicies.Admin, policy => policy.RequireRole(AppRoles.Admin));

// Auth cookie settings (same-origin SPA, so a HttpOnly cookie is enough)
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "coinportal.auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    // Dev runs on plain http; production must be https-only
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(14);
    options.SlidingExpiration = true;

    // API must return status codes instead of redirecting to a login page
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddAntiforgery(options =>
{
    // Angular sends the token back in this header
    options.HeaderName = "X-XSRF-TOKEN";
    options.Cookie.Name = "coinportal.af";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
});

builder.Services.AddControllersWithViews(options =>
{
    // Validates the antiforgery token on every POST/PUT/PATCH/DELETE
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
})
.AddJsonOptions(options =>
{
    // Enums as names ("Euro2") in both directions; reject raw numbers like 999
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
});

// Coin photos: storage folder and limits from the "PhotoStorage" section.
// The image library is only behind IImageProcessor; swap the implementation here.
builder.Services.AddOptions<PhotoOptions>()
    .Bind(builder.Configuration.GetSection(PhotoOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddSingleton<IPhotoStorage, FileSystemPhotoStorage>();
builder.Services.AddSingleton<IImageProcessor, ImageSharpImageProcessor>();
builder.Services.AddScoped<PhotoQuota>();

// Account export (ZIP) and deletion, for the user (Settings) and admins
builder.Services.AddScoped<AccountExport>();
builder.Services.AddScoped<AccountDeletion>();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Development-only: load test users and coins, then exit without starting the server
if (seedDevData)
{
    if (!app.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("Dev data can only be seeded in the Development environment.");
    }

    await DevDataSeeder.RunAsync(app);
    return;
}

// Before the first request, so the configured admins hold the role
// (the first database access: a failure here is logged before the app stops)
try
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<AdminRoleSync>().SyncAsync();
}
catch (Exception ex)
{
    app.Logger.LogCritical(ex, "Startup failed");
    throw;
}

// HTTPS redirection only outside development; the dev proxy talks plain HTTP
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Configure the HTTP request pipeline.
// API docs and test UI, development only
if (app.Environment.IsDevelopment())
{
    // OpenAPI document at /openapi/v1.json
    app.MapOpenApi();

    // Swagger UI at /swagger
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "CoinPortal API v1");
        options.DocumentTitle = "CoinPortal API";

        // Copy the readable XSRF-TOKEN cookie into the header the antiforgery filter expects.
        // Must stay a single line without backslashes or double quotes: Swashbuckle embeds it
        // in a JS string that is JSON-parsed, so escapes are decoded twice.
        options.UseRequestInterceptor(
            "(req) => { const c = document.cookie.split(`; `).find(x => x.startsWith(`XSRF-TOKEN=`)); if (c) { req.headers[`X-XSRF-TOKEN`] = decodeURIComponent(c.substring(11)); } return req; }");
    });
}

// The Angular client (wwwroot) before the request log: its files are not worth a line each
app.UseSpaStaticFiles();
app.UseAppRequestLogging();

app.UseAuthentication();
// After authentication: signed-in users are exempt from some limits
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapSpaFallback();

app.Run();
