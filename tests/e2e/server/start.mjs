// Starts the site for the e2e tests (Playwright's webServer): the API on its own port and
// database, serving a fresh client build from its web root like the published site does (one
// origin, SPA fallback). Nothing touches the developer's API (5080), ng serve (4200) or database.
//
//   1. builds the client and the API into tests/e2e/.build (E2E_SKIP_BUILD=1 reuses the last build;
//      the API builds next to bin/, so a running dev API does not lock it)
//   2. starts the API once (on another port) to sign up or sign in the e2e admin and learn its id
//   3. restarts it with that id in Admin:UserIds (the role is granted from configuration at startup)
//
// Environment: E2E_PORT (5091), COINPORTAL_E2E_SQL (connection string; LocalDB CoinPortal_E2E by
// default, created and migrated at startup).
//
// E2E_ENVIRONMENT=Production runs the site like the live one, for the ZAP scan in CI: Secure
// cookies, HSTS, HTTPS redirection, no Swagger. No admin set-up (signing in needs HTTPS there);
// E2E_URLS lists the addresses, e.g. an HTTPS one with its certificate in
// Kestrel__Certificates__Default__Path / __Password.
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ADMIN, BASE_URL, MAIL_DIR, PORT } from '../support/env.mjs';

const e2eDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(e2eDir, '../..');
const build = path.join(e2eDir, '.build');
const sql =
  process.env.COINPORTAL_E2E_SQL ??
  'Server=(localdb)\\MSSQLLocalDB;Database=CoinPortal_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True';
const environment = process.env.E2E_ENVIRONMENT ?? 'Development';

function run(command, cwd) {
  console.log(`[e2e] ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

if (process.env.E2E_SKIP_BUILD !== '1') {
  fs.rmSync(path.join(build, 'web'), { recursive: true, force: true });
  run(
    `npm exec --no -- ng build --output-path "${path.join(build, 'web')}"`,
    path.join(root, 'src/web'),
  );
  run(`dotnet build src/api -o "${path.join(build, 'api')}"`, root);
}

let api;

function startApi(adminId, url) {
  const env = {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: environment,
    ConnectionStrings__DefaultConnection: sql,
    Database__MigrateOnStartup: 'true',
    // Warnings and errors only (Development logs every SQL command)
    Serilog__MinimumLevel__Default: 'Warning',
    'Serilog__MinimumLevel__Override__Microsoft.EntityFrameworkCore': 'Warning',
    // Index 0 replaces the developer's own id from appsettings.Development.json
    Admin__UserIds__0: adminId ?? '',
    // Every test signs up and in from the same address
    RateLimiting__Auth__PermitLimit: '100000',
    RateLimiting__Public__PermitLimit: '100000',
    RateLimiting__Photos__PermitLimit: '100000',
    PhotoStorage__RootPath: path.join(build, 'data/photos'),
    PhotoStorage__SweepIntervalHours: '0',
    Logs__Path: path.join(build, 'data/logs'),
    DataProtection__KeysPath: path.join(build, 'data/keys'),
    // E-mails as .eml files the tests read (verification links point to this site)
    Email__PickupPath: MAIL_DIR,
    Email__SiteUrl: BASE_URL,
  };
  // Content root src/api (appsettings, dev seed); the client from the e2e build
  api = spawn(
    'dotnet',
    [
      path.join(build, 'api/CoinPortal.Api.dll'),
      '--urls',
      url,
      '--contentRoot',
      path.join(root, 'src/api'),
      '--webroot',
      path.join(build, 'web/browser'),
    ],
    { cwd: path.join(root, 'src/api'), env, stdio: 'inherit' },
  );
  api.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[e2e] API exited with ${code}`);
      process.exit(1);
    }
  });
}

async function waitForHealth(url) {
  for (let i = 0; i < 120; i++) {
    try {
      // In Production the plain HTTP address redirects to HTTPS: listening is enough
      const res = await fetch(`${url}/api/health`, { redirect: 'manual' });
      if (res.status < 400) {
        return;
      }
    } catch {
      // Not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('The API did not start');
}

async function stopApi() {
  api.removeAllListeners('exit');
  const stopped = new Promise((r) => api.once('exit', r));
  api.kill();
  await stopped;
}

/** Signs the e2e admin up (first run on this database) or in, and returns its id. */
async function adminId(url) {
  const cookies = new Map();
  const call = async (method, route, body) => {
    const res = await fetch(`${url}${route}`, {
      method,
      headers: {
        'content-type': 'application/json',
        cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        'x-xsrf-token': cookies.get('XSRF-TOKEN') ?? '',
      },
      body: body && JSON.stringify(body),
    });
    for (const header of res.headers.getSetCookie()) {
      const [pair] = header.split(';');
      const at = pair.indexOf('=');
      cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
    return res;
  };
  await call('GET', '/api/auth/antiforgery');
  let res = await call('POST', '/api/auth/login', {
    userNameOrEmail: ADMIN.userName,
    password: ADMIN.password,
  });
  if (res.status === 401) {
    res = await call('POST', '/api/auth/register', {
      firstName: 'E2E',
      lastName: 'Admin',
      userName: ADMIN.userName,
      email: `${ADMIN.userName}@example.com`,
      birthDate: '1980-01-01',
      password: ADMIN.password,
      acceptTerms: true,
    });
  }
  if (!res.ok) {
    throw new Error(`Could not sign in the e2e admin: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).id;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    api?.kill();
    process.exit(0);
  });
}

if (environment === 'Development') {
  // The setup run listens elsewhere: Playwright waits for BASE_URL and would start the tests early
  const setupUrl = `http://localhost:${PORT + 100}`;
  startApi(null, setupUrl);
  await waitForHealth(setupUrl);
  const id = await adminId(setupUrl);
  await stopApi();

  startApi(id, BASE_URL);
} else {
  startApi(null, process.env.E2E_URLS ?? BASE_URL);
}
await waitForHealth(BASE_URL);
console.log(`[e2e] site ready at ${BASE_URL} (port ${PORT})`);
