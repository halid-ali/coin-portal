import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/axe';
import { chooseOption } from '../support/combobox';
import { PASSWORD } from '../support/env.mjs';
import { verificationLink } from '../support/mail';
import { coinPng } from '../support/png';
import { uniqueUserName } from '../support/users';

// Sign-up → the link from the e-mail → own collection → coin with a cropped photo → the list in its views, sorted and filtered
test('a new user signs up, adds a coin with a photo and browses it', async ({ page }) => {
  const userName = uniqueUserName();

  await page.goto('/register');
  await expectAccessible(page, 'sign-up');
  await page.getByLabel('First name').fill('Ada');
  await page.getByLabel('Last name').fill('Lovelace');
  await page.getByLabel('Username').fill(userName);
  await page.getByLabel('Email').fill(`${userName}@example.com`);
  await page.getByLabel('Date of birth').fill('1990-05-17');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('checkbox', { name: /privacy policy/ }).check();
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL('/');

  // Another collection waits for a confirmed address
  await page.goto(await verificationLink(`${userName}@example.com`));
  await expect(
    page.getByRole('heading', { name: 'Your email address is confirmed' }),
  ).toBeVisible();

  // A new collection next to the one every account starts with
  await page.getByRole('link', { name: 'My collections' }).first().click();
  await expect(page.getByRole('heading', { name: 'My collections' })).toBeVisible();
  await page.getByRole('button', { name: 'New collection' }).click();
  const dialog = page.getByRole('dialog', { name: 'New collection' });
  await dialog.getByLabel('Name').fill('Euro 2006');
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden();
  // Creating opens the new collection
  await expect(page.getByRole('heading', { name: 'Euro 2006' })).toBeVisible();

  // The coin: the title is suggested from denomination, country and year
  await page
    .getByRole('link', { name: /Add (your first )?coin/ })
    .first()
    .click();
  await page.getByLabel('Denomination').selectOption({ label: '2 €' });
  await chooseOption(page, 'Country', 'Germany');
  await page.getByLabel('Year').fill('2006');
  await expect(page.getByLabel('Title')).toHaveValue(/2 €.*2006/);
  await expectAccessible(page, 'coin form');

  // The photo goes through the crop dialog and is uploaded on Save
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: /Choose photo/ })
    .first()
    .click();
  await (await chooser).setFiles({ name: 'coin.png', mimeType: 'image/png', buffer: coinPng() });
  const crop = page.getByRole('dialog', { name: /Crop photo/ });
  await expect(crop.getByRole('button', { name: 'Use photo' })).toBeEnabled();
  await expectAccessible(page, 'crop dialog');
  await crop.getByRole('button', { name: 'Use photo' }).click();
  await expect(crop).toBeHidden();
  await expect(page.getByText('Uploaded when you save')).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Back on the collection, with the coin and its photo
  await expect(page.getByRole('heading', { name: 'Euro 2006' })).toBeVisible();
  const table = page.getByRole('table', { name: 'Euro 2006' });
  await expect(table.getByRole('row')).toHaveCount(2);
  // The thumbnail is decorative (empty alt): no img role
  await expect(table.locator('img').first()).toHaveAttribute('src', /\/photos\//);
  await expectAccessible(page, 'collection');

  // View, sort and filter live in the URL
  await page.getByRole('button', { name: 'Grid view' }).click();
  await expect(page).toHaveURL(/view=grid/);
  await page.getByRole('button', { name: 'List view' }).click();
  await expect(page).not.toHaveURL(/view=/);
  await table.getByRole('button', { name: /^Year/ }).click();
  await expect(page).toHaveURL(/sort=Year/);
  await chooseOption(page, 'Denomination', '1 €');
  await expect(page).toHaveURL(/denomination=Euro1/);
  await expect(page.getByText('No coins match the filters.')).toBeVisible();
});
