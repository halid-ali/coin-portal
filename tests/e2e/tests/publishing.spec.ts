import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { TestUser } from '../support/users';

// The public collection rule: the banner counts towards the minimum and links the coins without a
// photo (a euro coin its national side); once met, its button makes the collection public. Taking a coin away
// asks first and makes the collection "link only"; making that one public again asks too. The minimum is the API's default (10).
test('a collection goes public once every coin has its photo, and leaves when one goes', async ({
  browser,
}) => {
  const owner = await TestUser.signUp();
  const collection = await owner.firstCollection();
  for (let i = 1; i <= 9; i++) {
    await owner.createPhotographedCoin(collection.id, `Coin ${i}`);
  }
  const unphotographed = await owner.createCoin(collection.id, 'Without photo');
  const context = await owner.browser(browser);
  const page = await context.newPage();

  await page.goto(`/collections/${collection.id}`);
  const banner = page.getByRole('region', { name: 'To publish your collection' });
  await expect(banner).toContainText('9/10 coins with photos');
  await expect(banner).toContainText('Meanwhile, you can share it by link.');
  await expectAccessible(page, 'collection with publication banner');

  // The link filters the coins that are missing their photo
  await banner.getByRole('link', { name: '1 coin is missing its photo' }).click();
  await expect(page).toHaveURL(/photo=missing/);
  await expect(page.getByLabel('Photo', { exact: true })).toHaveValue('missing');
  const table = page.getByRole('table', { name: collection.name });
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table.getByText('Without photo')).toBeVisible();

  // With its photo the collection is ready; one click makes it public
  await owner.uploadPhoto(unphotographed.id);
  await page.goto(`/collections/${collection.id}`);
  const ready = page.getByRole('region', { name: 'Your collection is ready for the showcase' });
  await expect(ready).toContainText('10/10 coins with photos');
  await ready.getByRole('button', { name: 'Make public' }).click();
  await expect(ready).toBeHidden();
  await expect(page.getByText('Public', { exact: true }).first()).toBeVisible();

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/u/${owner.userName}/${collection.id}`);
  await expect(visitorPage.getByText('Without photo').filter({ visible: true })).toBeVisible();

  // Deleting a coin takes it below the minimum: asked, then link only
  await page.goto(`/coins/${unphotographed.id}/edit`);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Delete coin' })
    .getByRole('button', { name: 'Delete' })
    .click();
  const unpublish = page.getByRole('dialog', { name: 'The collection will no longer be public' });
  await expect(unpublish).toContainText(`"${collection.name}" no longer meets the requirements`);
  await expectAccessible(page, 'unpublish dialog');
  await unpublish.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(new RegExp(`/collections/${collection.id}`));
  await expect(page.getByText('Link only', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'To publish your collection' })).toContainText(
    '9/10 coins with photos',
  );
  await visitorPage.reload();
  await expect(visitorPage.getByText(/^Collection not found. The link/)).toBeVisible();

  // Public again from "link only": the share link stops working, so it asks first
  await owner.createPhotographedCoin(collection.id, 'Coin 10');
  await page.reload();
  await page
    .getByRole('region', { name: 'Your collection is ready for the showcase' })
    .getByRole('button', { name: 'Make public' })
    .click();
  const linkEnds = page.getByRole('dialog', { name: 'The share link will stop working' });
  await expectAccessible(page, 'publish shared collection dialog');
  await linkEnds.getByRole('button', { name: 'Make public' }).click();
  await expect(page.getByText('Public', { exact: true }).first()).toBeVisible();
  await visitorPage.reload();
  await expect(visitorPage.getByText('Coin 10').filter({ visible: true })).toBeVisible();

  await visitor.close();
  await context.close();
  await owner.dispose();
});

test('an admin sees the general settings', async ({ browser }) => {
  const admin = await TestUser.admin();
  const context = await admin.browser(browser);
  const page = await context.newPage();

  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Public collections' })).toBeVisible();
  await expect(page.getByLabel('Minimum coins with photos')).toHaveValue(/^\d+$/);
  await expectAccessible(page, 'admin settings');

  await context.close();
  await admin.dispose();
});
