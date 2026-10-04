import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { TestUser } from '../support/users';

// A link-only collection: visitors see it with the link; a new link makes the old one useless
test('a private link shows the collection signed out until the owner renews it', async ({
  browser,
}) => {
  const owner = await TestUser.signUp();
  const collection = await owner.setVisibility(await owner.firstCollection(), 'Unlisted');
  await owner.createCoin(collection.id, 'Shared coin');
  const oldLink = `/s/${collection.shareToken}`;

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(oldLink);
  await expect(visitorPage.getByRole('heading', { name: collection.name })).toBeVisible();
  await expect(
    visitorPage.getByText('Shared coin').filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(visitorPage.getByText(/shared with you through a private link/)).toBeVisible();
  await expectAccessible(visitorPage, 'shared collection');

  // The owner renews the link in the edit dialog
  const ownerContext = await owner.browser(browser);
  const page = await ownerContext.newPage();
  await page.goto(`/collections/${collection.id}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit collection' });
  const linkField = dialog.getByRole('textbox', { name: 'Share link' });
  await expect(linkField).toHaveValue(new RegExp(`${oldLink}$`));
  await expectAccessible(page, 'edit collection dialog');
  await dialog.getByRole('button', { name: 'Create new link' }).click();
  const confirm = page.getByRole('dialog', { name: 'Create new link' });
  await confirm.getByRole('button', { name: 'Create new link' }).click();
  await expect(linkField).not.toHaveValue(new RegExp(`${oldLink}$`));
  const newLink = new URL(await linkField.inputValue()).pathname;

  // The old link is gone, the new one works
  await visitorPage.goto(oldLink);
  await expect(visitorPage.getByText(/link may be invalid/)).toBeVisible();
  await visitorPage.goto(newLink);
  await expect(
    visitorPage.getByText('Shared coin').filter({ visible: true }).first(),
  ).toBeVisible();

  await Promise.all([visitor.close(), ownerContext.close(), owner.dispose()]);
});

// Not a route at all: the not-found page instead of a silent jump to the home page
test('an unknown address shows the not-found page and keeps the address', async ({ page }) => {
  await page.goto('/s/abc/extra');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page).toHaveURL(/\/s\/abc\/extra$/);
  await expect(page).toHaveTitle('Page not found · CoinVitrine');
  await expectAccessible(page, 'not found');
});
