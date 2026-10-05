import { APIRequestContext, Browser, BrowserContext, expect, request } from '@playwright/test';

import { ADMIN, BASE_URL, PASSWORD } from './env.mjs';
import { coinPng } from './png';

export type Visibility = 'Private' | 'Unlisted' | 'Public';

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  visibility: Visibility;
  shareToken: string | null;
}

let counter = 0;

/** A fresh, valid username (3-20 characters), unique across runs on the same database. */
export function uniqueUserName(): string {
  const time = Date.now().toString(36).slice(-7);
  const rand = Math.random().toString(36).slice(2, 6);
  return `e2e${time}${rand}${counter++ % 10}`;
}

/**
 * A user with its own cookie jar, driving the API the way the SPA does (antiforgery token in a
 * header, renewed after signing in). Tests set their data up through it and open a signed-in
 * browser context with browser().
 */
export class TestUser {
  private constructor(
    readonly api: APIRequestContext,
    readonly userName: string,
    readonly password: string,
    readonly id: string,
  ) {}

  /** Signs a new user up through the API (the UI sign-up has its own test). */
  static async signUp(): Promise<TestUser> {
    const userName = uniqueUserName();
    const api = await request.newContext({ baseURL: BASE_URL });
    await api.get('/api/auth/antiforgery');
    const res = await api.post('/api/auth/register', {
      data: {
        firstName: 'Test',
        lastName: 'User',
        userName,
        email: `${userName}@example.com`,
        birthDate: '1990-01-01',
        password: PASSWORD,
        acceptTerms: true,
      },
      headers: { 'X-XSRF-TOKEN': await xsrf(api) },
    });
    expect(res.status(), await res.text()).toBe(200);
    // The token belongs to the user, as in the app
    await api.get('/api/auth/antiforgery');
    return new TestUser(api, userName, PASSWORD, (await res.json()).id);
  }

  /** The e2e admin (server/start.mjs puts its id in Admin:UserIds). */
  static async admin(): Promise<TestUser> {
    const api = await request.newContext({ baseURL: BASE_URL });
    await api.get('/api/auth/antiforgery');
    const res = await api.post('/api/auth/login', {
      data: { userNameOrEmail: ADMIN.userName, password: ADMIN.password },
      headers: { 'X-XSRF-TOKEN': await xsrf(api) },
    });
    expect(res.status(), await res.text()).toBe(200);
    await api.get('/api/auth/antiforgery');
    return new TestUser(api, ADMIN.userName, ADMIN.password, (await res.json()).id);
  }

  async send(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: unknown) {
    const res = await this.api.fetch(url, {
      method,
      data,
      headers: { 'X-XSRF-TOKEN': await xsrf(this.api) },
    });
    expect(res.ok(), `${method} ${url}: ${res.status()} ${await res.text()}`).toBe(true);
    return res.status() === 204 ? null : res.json();
  }

  /** The collection every user gets at sign-up. */
  async firstCollection(): Promise<Collection> {
    return (await this.send('GET', '/api/collections'))[0];
  }

  async setVisibility(collection: Collection, visibility: Visibility): Promise<Collection> {
    return this.send('PUT', `/api/collections/${collection.id}`, {
      name: collection.name,
      description: collection.description,
      visibility,
    });
  }

  async createCoin(collectionId: number, title: string, year = 2006): Promise<{ id: number }> {
    return this.send('POST', '/api/coins', {
      title,
      denomination: 'Euro2',
      countryCode: 'DE',
      year,
      collectionId,
    });
  }

  /** A coin created with a national side photo, so it counts for a public collection. */
  async createPhotographedCoin(collectionId: number, title: string): Promise<{ id: number }> {
    const coin = { title, denomination: 'Euro2', countryCode: 'DE', year: 2006, collectionId };
    const res = await this.api.post('/api/coins/with-photos', {
      multipart: {
        coin: JSON.stringify(coin),
        national: { name: 'coin.png', mimeType: 'image/png', buffer: coinPng(200) },
      },
      headers: { 'X-XSRF-TOKEN': await xsrf(this.api) },
    });
    expect(res.status(), await res.text()).toBe(201);
    return res.json();
  }

  /**
   * Makes the collection Public under its name: first adds photographed coins up to the site's
   * minimum (the API's default, 10, unless an admin changed it).
   */
  async publish(collection: Collection, name = collection.name): Promise<Collection> {
    const current = await this.send('GET', `/api/collections/${collection.id}`);
    for (let i = current.photographedCoinCount; i < current.minPublicCoins; i++) {
      await this.createPhotographedCoin(collection.id, `Coin ${i + 1}`);
    }
    return this.send('PUT', `/api/collections/${collection.id}`, {
      name,
      description: collection.description,
      visibility: 'Public',
    });
  }

  /** A browser context signed in as this user (the API's cookies). */
  async browser(browser: Browser): Promise<BrowserContext> {
    return browser.newContext({ storageState: await this.api.storageState() });
  }

  dispose(): Promise<void> {
    return this.api.dispose();
  }
}

async function xsrf(api: APIRequestContext): Promise<string> {
  const { cookies } = await api.storageState();
  return decodeURIComponent(cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? '');
}
