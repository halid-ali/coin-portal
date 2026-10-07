import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { resetLink } from '../support/mail';
import { TestUser } from '../support/users';

// From the sign-in page: the link takes the typed username along, the page after sending is the
// same for every account, the e-mail's link shows the account and sets the new password, and the
// sign-in says so with the username filled in
test('a user who forgot the password sets a new one with the link from the email', async ({
  page,
}) => {
  const user = await TestUser.signUp();
  const newPassword = 'Newpass456';

  await page.goto('/login');
  await page.getByLabel('Username or email').fill(user.userName);
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
  await expect(page.getByLabel('Username or email')).toHaveValue(user.userName);
  await expectAccessible(page, 'forgot password');

  await page.getByRole('button', { name: 'Send link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeFocused();
  await expectAccessible(page, 'reset link sent');

  await page.goto(await resetLink(`${user.userName}@example.com`));
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  // The secret leaves the address bar
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByText(user.userName, { exact: true })).toBeVisible();
  await expectAccessible(page, 'new password');
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  // The eye button shows what was typed (every password field has one)
  const show = page.getByRole('button', { name: 'Show password' }).first();
  await show.click();
  await expect(show).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Save password' }).click();

  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('status')).toContainText('Your password has been changed');
  await expect(page.getByLabel('Username or email')).toHaveValue(user.userName);
  await expectAccessible(page, 'sign-in after reset');
  await page.getByLabel('Password', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();

  await user.dispose();
});

test('a used, damaged or expired reset link says so', async ({ page }) => {
  await page.goto('/reset-password?token=damaged');

  await expect(
    page.getByRole('heading', { name: 'The link is invalid or has expired' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
  await expectAccessible(page, 'invalid reset link');
});
