import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { chooseOption } from '../support/combobox';
import { TestUser } from '../support/users';

// A coin other than a euro coin (roadmap 18): added in the form with its value and currency, found
// with the All / Euro / Other buttons, which show only where both kinds are
test('a user adds an other coin and finds it with the kind buttons', async ({ browser }) => {
  const owner = await TestUser.signUp();
  const collection = await owner.firstCollection();
  await owner.createCoin(collection.id, 'Brandenburger Tor');
  const context = await owner.browser(browser);
  const page = await context.newPage();

  await page.goto(`/coins/new?collection=${collection.id}`);
  await page.getByRole('radio', { name: /^Other coin/ }).check();
  await page.getByLabel('Value').fill('0.5');
  await page.getByLabel('Currency').fill('penny');
  // The country list: typing filters it, names starting with the text first
  const country = page.getByRole('combobox', { name: 'Country', exact: true });
  const countries = page.getByRole('listbox', { name: 'Country', exact: true }).getByRole('option');
  await country.fill('king');
  await expect(countries).toHaveText(['United Kingdom']);
  await country.fill('united');
  await expect(countries.first()).toHaveText('United Arab Emirates');
  await expectAccessible(page, 'coin form with the country list open');
  await page.getByRole('option', { name: 'United Kingdom', exact: true }).click();
  await page.getByLabel('Year').fill('1967');
  await expect(page.getByLabel('Title')).toHaveValue('0.5 penny · United Kingdom · 1967');
  await expect(page.getByText('Front', { exact: true })).toBeVisible();
  await expect(page.getByText('Back', { exact: true })).toBeVisible();
  await expectAccessible(page, 'coin form for an other coin');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/collections/${collection.id}$`));
  const table = page.getByRole('table', { name: collection.name });
  const row = table.getByRole('row').filter({ hasText: '0.5 penny · United Kingdom' });
  await expect(row.getByRole('cell', { name: '0.5 penny', exact: true })).toBeVisible();
  await expect(row.getByRole('cell', { name: 'United Kingdom', exact: true })).toBeVisible();

  const kinds = page.getByRole('group', { name: 'Coin type' });
  await expect(kinds.getByRole('button')).toHaveText(['All 2', 'Euro 1', 'Other 1']);
  await expectAccessible(page, 'collection with both kinds');
  await kinds.getByRole('button', { name: /^Other/ }).click();
  await expect(page).toHaveURL(/kind=Other/);
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(page.getByLabel('Denomination')).toContainText('penny');

  await context.close();
  await owner.dispose();
});

// An other coin counts for a public collection with both sides; explore shows the kinds too
test('an other coin needs both sides for a public collection', async ({ browser }) => {
  const owner = await TestUser.signUp();
  const collection = await owner.firstCollection();
  for (let i = 1; i <= 9; i++) {
    await owner.createPhotographedCoin(collection.id, `Coin ${i}`);
  }
  const lira = await owner.createOtherCoin(
    collection.id,
    {
      title: '25 lira · Türkiye · 1985',
      faceValue: 25,
      currency: 'lira',
      countryCode: 'TR',
      year: 1985,
    },
    'front',
  );
  const context = await owner.browser(browser);
  const page = await context.newPage();

  await page.goto(`/collections/${collection.id}`);
  const banner = page.getByRole('region', { name: 'To publish your collection' });
  await expect(banner).toContainText('9/10 coins with photos');
  await expect(banner.getByRole('link', { name: '1 coin is missing its photo' })).toBeVisible();

  // With its back too it counts
  await owner.uploadPhoto(lira.id, 'common');
  await page.reload();
  const ready = page.getByRole('region', { name: 'Your collection is ready for the showcase' });
  await ready.getByRole('button', { name: 'Make public' }).click();
  await expect(page.getByText('Public', { exact: true }).first()).toBeVisible();

  const visitor = await browser.newContext();
  const explore = await visitor.newPage();
  await explore.goto(`/explore?owner=${owner.userName}`);
  const kinds = explore.getByRole('group', { name: 'Coin type' });
  await expect(kinds.getByRole('button')).toHaveText(['All 10', 'Euro 9', 'Other 1']);
  await kinds.getByRole('button', { name: /^Other/ }).click();
  await expect(explore).toHaveURL(/kind=Other/);
  await expect(
    explore.getByText('25 lira · Türkiye · 1985').filter({ visible: true }),
  ).toBeVisible();
  await expectAccessible(explore, 'explore with both kinds');

  await visitor.close();
  await context.close();
  await owner.dispose();
});
