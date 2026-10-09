import { Page } from '@playwright/test';

/**
 * Picks an option of a combobox (a text box with a list typing filters: the coin form's country,
 * the coin lists' filters) the way a user does: types the name and clicks it in the list. Found by
 * role, as the open list carries the field's name too.
 */
export async function chooseOption(page: Page, field: string, name: string): Promise<void> {
  await page.getByRole('combobox', { name: field, exact: true }).fill(name);
  await page.getByRole('option', { name, exact: true }).click();
}
