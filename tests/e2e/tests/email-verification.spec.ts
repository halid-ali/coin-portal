import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { verificationLink } from '../support/mail';
import { TestUser } from '../support/users';

// Sign-up leaves the address unconfirmed: the notice above every page says so and sends the link
// again, and no other collection can be opened; the link from the e-mail confirms it, the notice
// goes away and a new collection can be made
test('a new user confirms their email address with the link from the email', async ({
  browser,
}) => {
  const user = await TestUser.signUp(false);
  const address = `${user.userName}@example.com`;
  const context = await user.browser(browser);
  const page = await context.newPage();

  await page.goto('/collections');
  const notice = page.getByRole('region', { name: 'Email verification' });
  await expect(notice).toContainText(address);
  await expect(
    page.getByText('Confirm your email address to open a new collection.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New collection' })).toHaveCount(0);
  await expectAccessible(page, 'email notice');

  await notice.getByRole('button', { name: 'Send the link again' }).click();
  await expect(notice.getByRole('status')).toContainText(`A new link was sent to ${address}`);

  await page.goto(await verificationLink(address));
  await expect(
    page.getByRole('heading', { name: 'Your email address is confirmed' }),
  ).toBeVisible();
  // The secret leaves the address bar
  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(notice).toBeHidden();
  await expectAccessible(page, 'email confirmed');
  await page.goto('/collections');
  await expect(page.getByRole('button', { name: 'New collection' })).toBeVisible();
  await context.close();
});

test('a damaged or expired link says so', async ({ page }) => {
  await page.goto('/verify-email?token=damaged');

  await expect(
    page.getByRole('heading', { name: 'The link is invalid or has expired' }),
  ).toBeVisible();
  await expectAccessible(page, 'invalid verification link');
});
