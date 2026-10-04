import { Browser, expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { TestUser } from '../support/users';

/** A user with a public collection holding one coin, and the collection's public address. */
async function publicCollector() {
  const user = await TestUser.signUp();
  const collection = await user.setVisibility(await user.firstCollection(), 'Public');
  await user.send('PUT', `/api/collections/${collection.id}`, {
    name: `Public ${user.userName}`,
    visibility: 'Public',
  });
  await user.createCoin(collection.id, 'Public coin');
  return { user, name: `Public ${user.userName}`, url: `/u/${user.userName}/${collection.id}` };
}

async function adminPage(browser: Browser) {
  const admin = await TestUser.admin();
  const context = await admin.browser(browser);
  return { admin, context, page: await context.newPage() };
}

// Moderation: a locked user cannot sign in and their shared collections disappear. (That the open
// session ends within a minute is covered by the API tests, where cookies are checked every time.)
test('an admin locks a user', async ({ browser }) => {
  const { user, url } = await publicCollector();
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(url);
  await expect(
    visitorPage.getByText('Public coin').filter({ visible: true }).first(),
  ).toBeVisible();

  const { admin, context, page } = await adminPage(browser);
  await page.goto(`/admin/users/${user.id}`);
  await expect(page.getByRole('heading', { name: user.userName })).toBeVisible();
  await expectAccessible(page, 'admin user');
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Lock user' });
  await confirm.getByLabel('Note (optional)').fill('e2e');
  await confirm.getByRole('button', { name: 'Lock', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unlock', exact: true })).toBeVisible();

  await visitorPage.reload();
  await expect(visitorPage.getByText(/^Collection not found. The link/)).toBeVisible();

  await visitorPage.goto('/login');
  await visitorPage.getByLabel('Username or email').fill(user.userName);
  await visitorPage.getByLabel('Password').fill(user.password);
  await visitorPage.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    visitorPage.getByText('Your account has been locked by an administrator.'),
  ).toBeVisible();

  await Promise.all([visitor.close(), context.close(), admin.dispose(), user.dispose()]);
});

// A hidden collection is private to its owner, who sees why
test('an admin hides a public collection', async ({ browser }) => {
  const { user, name, url } = await publicCollector();
  const { admin, context, page } = await adminPage(browser);

  await page.goto('/admin/collections');
  await page.getByPlaceholder('Search collection or username').fill(user.userName);
  await page.getByRole('button', { name: `Hide: ${name}` }).click();
  const confirm = page.getByRole('dialog', { name: 'Hide collection' });
  await confirm.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(page.getByRole('button', { name: `Unlock: ${name}` })).toBeVisible();
  await expectAccessible(page, 'admin collections');

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(url);
  await expect(visitorPage.getByText(/^Collection not found. The link/)).toBeVisible();

  const ownerContext = await user.browser(browser);
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(url.replace(`/u/${user.userName}/`, '/collections/'));
  await expect(ownerPage.getByText('Hidden', { exact: true })).toBeVisible();

  await Promise.all([
    visitor.close(),
    ownerContext.close(),
    context.close(),
    admin.dispose(),
    user.dispose(),
  ]);
});
