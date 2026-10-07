// Shared by the server script and the tests
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PORT = Number(process.env.E2E_PORT ?? 5091);
export const BASE_URL = `http://localhost:${PORT}`;

/** Granted the Admin role by server/start.mjs. A throwaway account of the e2e database only. */
export const ADMIN = { userName: 'e2e-admin', password: 'E2eAdmin-Passw0rd' };

/** Where the API writes its e-mails (Email:PickupPath: no SMTP in e2e), one .eml file each. */
export const MAIL_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.build/data/mail',
);

/** The password of every user the tests sign up. */
export const PASSWORD = 'E2eUser-Passw0rd';
