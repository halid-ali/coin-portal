// Shared by the server script and the tests
export const PORT = Number(process.env.E2E_PORT ?? 5091);
export const BASE_URL = `http://localhost:${PORT}`;

/** Granted the Admin role by server/start.mjs. A throwaway account of the e2e database only. */
export const ADMIN = { userName: 'e2e-admin', password: 'E2eAdmin-Passw0rd' };

/** The password of every user the tests sign up. */
export const PASSWORD = 'E2eUser-Passw0rd';
