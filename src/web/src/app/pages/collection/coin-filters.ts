import { CoinFacets, CoinKind, DENOMINATIONS, Denomination } from '../../core/coins/coin.models';

// The kind buttons and the denomination filter of a coin list (user choices 2026-10-09): the
// buttons only where both kinds are, the denomination filter lists what the chosen kind has.

/** "Euro" or "Other" from the URL; anything else is every kind. */
export function toKind(value: string | undefined): CoinKind | undefined {
  return value === 'Euro' || value === 'Other' ? value : undefined;
}

/** The All / Euro / Other buttons, only for a list with both kinds. */
export function showKinds(facets: CoinFacets | null): boolean {
  return !!facets && facets.euroCount > 0 && facets.otherCount > 0;
}

/** A currency in the denomination select, kept apart from the euro denominations. */
export const CURRENCY_OPTION = 'currency:';

/** The denomination select's value → the URL's denomination or currency. */
export function nominalSelection(value: string): {
  denomination: string | null;
  currency: string | null;
} {
  return value.startsWith(CURRENCY_OPTION)
    ? { denomination: null, currency: value.slice(CURRENCY_OPTION.length) || null }
    : { denomination: value || null, currency: null };
}

export interface NominalOptions {
  denominations: readonly Denomination[];
  currencies: string[];
  /** Both in one select: under a "Euro coin" and a "World coin" heading. */
  grouped: boolean;
}

/**
 * What the denomination select offers: the euro denominations for euro coins, the list's
 * currencies for other coins, both (grouped) for every kind when the list has both. Without the
 * facets (still loading, or failed) a list is taken for euro coins, as before other coins existed.
 * A currency in the URL stays offered, so the select can show it.
 */
export function nominalOptions(
  kind: CoinKind | undefined,
  facets: CoinFacets | null,
  selectedCurrency: string | undefined,
): NominalOptions {
  const currencies = [...(facets?.currencies ?? [])];
  if (
    selectedCurrency &&
    !currencies.some((c) => c.toLowerCase() === selectedCurrency.toLowerCase())
  ) {
    currencies.push(selectedCurrency);
  }
  if (kind === 'Euro') {
    return { denominations: DENOMINATIONS, currencies: [], grouped: false };
  }
  if (kind === 'Other') {
    return { denominations: [], currencies, grouped: false };
  }
  const euro = !facets || facets.euroCount > 0 || facets.otherCount === 0;
  const other = currencies.length > 0;
  return { denominations: euro ? DENOMINATIONS : [], currencies, grouped: euro && other };
}
