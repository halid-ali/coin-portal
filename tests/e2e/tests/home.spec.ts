import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { TestUser } from '../support/users';

// Visitors get the introduction: sign-up and sign-in side by side, the free / no ads promise
test('the home page introduces the site to visitors', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Your collection, a showcase in your pocket.' }),
  ).toBeVisible();
  const signUp = page.getByRole('main').getByRole('link', { name: 'Sign up for free' }).first();
  const signIn = page.getByRole('main').getByRole('link', { name: 'Sign in' });
  await expect(signUp).toBeVisible();
  await expect(signIn).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'No ads' })).toBeVisible();
  await expectAccessible(page, 'home (visitor)');

  await signUp.click();
  await expect(page).toHaveURL('/register');
});

// Signed in: the quick check finds a coin in any collection by its words in any order
test('the dashboard shows the counts and checks whether a coin is owned', async ({ browser }) => {
  const user = await TestUser.signUp();
  const collection = await user.firstCollection();
  await user.createCoin(collection.id, '2 € · Germany · 2006');
  await user.createCoin(collection.id, '2 € · Germany · 2011', 2011);
  const context = await user.browser(browser);
  const page = await context.newPage();

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /^Welcome, / })).toBeVisible();
  await expect(page.getByText('You have 2 coins in your collection.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recently added' })).toBeVisible();
  await expectAccessible(page, 'home (dashboard)');

  const check = page.getByLabel('Do I have this coin?');
  await check.fill('2006 germany');
  await expect(page.getByRole('link', { name: /Owned\s+2 € · Germany · 2006/ })).toBeVisible();
  await expect(page.getByText('2 € · Germany · 2011')).toHaveCount(1); // only in "recently added"

  await check.fill('malta');
  await expect(page.getByText('Not in your collection.')).toBeVisible();
  await expectAccessible(page, 'home (quick check)');

  await context.close();
  await user.dispose();
});

// Phones: the footer (with its language selector) is at the end of the page, so visitors get a
// languages button in the navbar
test('visitors on a phone switch the language from the navbar', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');

  const navbar = page.getByRole('banner');
  await navbar.getByRole('button', { name: 'Language: English' }).click();
  await expect(page.getByRole('option')).toHaveCount(4);
  await expectAccessible(page, 'languages list (phone)');
  await page.getByRole('option', { name: 'Deutsch' }).click();

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Deine Sammlung als Vitrine für die Hosentasche.',
    }),
  ).toBeVisible();
  await expect(navbar.getByRole('button', { name: 'Sprache: Deutsch' })).toBeVisible();
});
