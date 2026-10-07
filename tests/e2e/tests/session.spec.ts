import { Page, expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { TestUser } from '../support/users';

/** Fills the sign-in form of the current page. */
async function signIn(page: Page, user: TestUser, remember: boolean) {
  await page.getByLabel('Username or email').fill(user.userName);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('checkbox', { name: 'Remember me' }).setChecked(remember);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();
}

const authCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name === 'coinportal.auth');

// "Remember me" (checked by default) keeps the session for 14 days; without it, it ends with the browser
test('remember me decides whether the session outlives the browser', async ({ browser }) => {
  const user = await TestUser.signUp();

  const remembered = await browser.newContext();
  const page = await remembered.newPage();
  await page.goto('/login');
  await expect(page.getByRole('checkbox', { name: 'Remember me' })).toBeChecked();
  await expectAccessible(page, 'sign-in');
  await signIn(page, user, true);
  const persistent = await authCookie(page);
  const days = (persistent!.expires * 1000 - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(13);
  expect(persistent!.httpOnly).toBe(true);

  const once = await browser.newContext();
  const sessionPage = await once.newPage();
  await sessionPage.goto('/login');
  await signIn(sessionPage, user, false);
  // -1: a session cookie, gone when the browser closes
  expect((await authCookie(sessionPage))!.expires).toBe(-1);

  await Promise.all([remembered.close(), once.close(), user.dispose()]);
});

// The cookie is gone (expired, signed out elsewhere): the next request takes the user to sign in
// and back to where they were
test('an ended session leads to the sign-in page and back', async ({ browser }) => {
  const user = await TestUser.signUp();
  const context = await user.browser(browser);
  const page = await context.newPage();
  await page.goto('/settings/profile');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await context.clearCookies({ name: 'coinportal.auth' });
  await page.getByRole('link', { name: 'My collections' }).first().click();

  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcollections/);
  await signIn(page, user, true);
  await expect(page).toHaveURL('/collections');

  await Promise.all([context.close(), user.dispose()]);
});
