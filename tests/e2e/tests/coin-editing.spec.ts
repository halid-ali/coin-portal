import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { chooseOption } from '../support/combobox';
import { TestUser } from '../support/users';

// A euro coin from the list to the form and back: every field is changed, the list shows the new
// values and filters by them; then the coin is deleted. Written down before coins other than euro
// coins (roadmap 18).
test('a user edits every field of a euro coin and deletes it', async ({ browser }) => {
  const owner = await TestUser.signUp();
  const collection = await owner.firstCollection();
  await owner.createCoin(collection.id, 'Brandenburger Tor');
  const context = await owner.browser(browser);
  const page = await context.newPage();

  await page.goto(`/collections/${collection.id}`);
  const table = page.getByRole('table', { name: collection.name });
  await table.getByRole('link', { name: 'Edit Brandenburger Tor' }).click();
  await expect(page.getByRole('heading', { name: 'Edit coin' })).toBeVisible();

  // The saved values, and the title is no longer suggested
  await expect(page.getByLabel('Denomination')).toHaveValue('2 €');
  await expect(page.getByLabel('Country')).toHaveValue('Germany');
  await expect(page.getByLabel('Year')).toHaveValue('2006');
  await expect(page.getByLabel('Title')).toHaveValue('Brandenburger Tor');
  await expect(page.getByText('National side', { exact: true })).toBeVisible();
  await expect(page.getByText('Common side', { exact: true })).toBeVisible();
  await expectAccessible(page, 'coin edit form');

  await chooseOption(page, 'Denomination', '10 cent');
  await chooseOption(page, 'Country', 'Austria');
  await page.getByLabel('Year').fill('2002');
  await expect(page.getByLabel('Title')).toHaveValue('Brandenburger Tor');
  await page.getByLabel('Title').fill('Mozart');
  await page.getByLabel('Mint mark').fill('W');
  await page.getByLabel('Commemorative').check();
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Back on the list with the new values
  await expect(page).toHaveURL(new RegExp(`/collections/${collection.id}$`));
  const row = table.getByRole('row').filter({ hasText: 'Mozart' });
  for (const value of ['10 cent', 'Austria', '2002', 'W', 'Yes']) {
    await expect(row.getByRole('cell', { name: value, exact: true })).toBeVisible();
  }

  // The filters find it by its new values only
  await chooseOption(page, 'Denomination', '10 cent');
  await chooseOption(page, 'Country', 'Austria');
  await expect(page).toHaveURL(/denomination=Cent10&countryCode=AT/);
  await expect(table.getByRole('row')).toHaveCount(2);
  await chooseOption(page, 'Denomination', '2 €');
  await expect(page.getByText('No coins match the filters.')).toBeVisible();

  // Deleting asks first, then the collection is empty
  await page.goto(`/collections/${collection.id}`);
  await table.getByRole('link', { name: 'Edit Mozart' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Delete coin' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page).toHaveURL(new RegExp(`/collections/${collection.id}`));
  await expect(page.getByText('There are no coins in this collection yet.')).toBeVisible();

  await context.close();
  await owner.dispose();
});
