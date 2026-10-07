import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { TestUser } from '../support/users';

// Settings > Security: the new password works from now on and this session stays signed in
// (the other sessions end; the API tests check that, the cookie check here runs once a minute)
test('a signed-in user changes the password in the settings', async ({ browser }) => {
  const user = await TestUser.signUp();
  const newPassword = 'Newpass456';
  const context = await user.browser(browser);
  const page = await context.newPage();

  await page.goto('/settings');
  await page.getByRole('link', { name: 'Security' }).click();
  await expect(page).toHaveURL('/settings/security');
  await expect(page.getByRole('heading', { name: 'Previous sign-in' })).toBeVisible();
  await expectAccessible(page, 'security settings');

  await page.getByLabel('Current password').fill(user.password);
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByRole('status')).toContainText('Your password has been changed');
  await expect(page.getByLabel('Current password')).toHaveValue('');
  await expectAccessible(page, 'password changed');

  // Still signed in here
  await page.getByRole('link', { name: 'My collections' }).first().click();
  await expect(page).toHaveURL('/collections');

  // The new password signs in elsewhere
  const other = await browser.newContext();
  const signIn = await other.newPage();
  await signIn.goto('/login');
  await signIn.getByLabel('Username or email').fill(user.userName);
  await signIn.getByLabel('Password', { exact: true }).fill(newPassword);
  await signIn.getByRole('button', { name: 'Sign in' }).click();
  await expect(signIn.getByRole('button', { name: /Account menu/ })).toBeVisible();

  await Promise.all([context.close(), other.close(), user.dispose()]);
});
