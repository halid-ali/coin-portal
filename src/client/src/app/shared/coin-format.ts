import { DENOMINATIONS, Denomination } from '../core/coins/coin.models';

export function denominationLabel(value: Denomination | string | null | undefined): string {
  return DENOMINATIONS.find((d) => d.value === value)?.label ?? '';
}

export function isDenomination(value: string | null | undefined): value is Denomination {
  return DENOMINATIONS.some((d) => d.value === value);
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