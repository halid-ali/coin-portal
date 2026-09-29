import { translate } from '@jsverse/transloco';

import { DENOMINATIONS, Denomination } from '../core/coins/coin.models';

/** Label in the active language, e.g. "2 €", "50 cent"; empty for unknown values. */
export function denominationLabel(value: Denomination | string | null | undefined): string {
  return isDenomination(value) ? translate(`coin.denomination.${value}`) : '';
}

export function isDenomination(value: string | null | undefined): value is Denomination {
  return DENOMINATIONS.includes(value as Denomination);
}

/** Default title from the identifying fields, e.g. "2 € · Almanya · 2006". */
export function suggestTitle(
  denomination: string | null | undefined,
  countryName: string | null | undefined,
  year: number | null | undefined,
): string {
  return [denominationLabel(denomination), countryName ?? '', year ? String(year) : '']
    .filter((part) => part.length > 0)
    .join(' · ');
}
