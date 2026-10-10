import { Page } from '@playwright/test';

/**
 * Picks an option of a combobox (the coin form's country, the coin lists' filters) the way a user
 * does: types the name into a box to type in, or opens a list without typing (a short fixed list,
 * a button: the denomination, commemorative, photos, sort, page size), and clicks the option.
 * Found by role, as the open list carries the field's name too.
 */
export async function chooseOption(page: Page, field: string, name: string): Promise<void> {
  const box = page.getByRole('combobox', { name: field, exact: true });
  if ((await box.evaluate((element) => element.tagName)) === 'INPUT') {
    await box.fill(name);
  } else {
    await box.click();
  }
  await page.getByRole('option', { name, exact: true }).click();
}
