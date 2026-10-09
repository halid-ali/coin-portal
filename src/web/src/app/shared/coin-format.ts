import { translate } from '@jsverse/transloco';

import { Coin, CoinKind, CoinSide, DENOMINATIONS, Denomination } from '../core/coins/coin.models';
import { cachedIntl } from '../core/i18n/intl-cache';

/** Label in the active language, e.g. "2 €", "50 cent"; empty for unknown values. */
export function denominationLabel(value: Denomination | string | null | undefined): string {
  return isDenomination(value) ? translate(`coin.denomination.${value}`) : '';
}

export function isDenomination(value: string | null | undefined): value is Denomination {
  return DENOMINATIONS.includes(value as Denomination);
}

/** An other coin's value in the language's number format, e.g. "25 kuruş", "0,5 penny" (tr). */
export function faceValueLabel(
  faceValue: number | null | undefined,
  currency: string | null | undefined,
  lang: string,
): string {
  if (faceValue === null || faceValue === undefined) {
    return currency ?? '';
  }
  const format = cachedIntl(
    `faceValue|${lang}`,
    () => new Intl.NumberFormat(lang, { maximumFractionDigits: 4 }),
  );
  return [format.format(faceValue), currency ?? ''].filter((part) => part.length > 0).join(' ');
}

/** The value of either kind of coin: "2 €" (euro) or "25 kuruş" (other). */
export function coinValueLabel(
  coin: Pick<Coin, 'kind' | 'denomination' | 'faceValue' | 'currency'>,
  lang: string,
): string {
  return coin.kind === 'Other'
    ? faceValueLabel(coin.faceValue, coin.currency, lang)
    : denominationLabel(coin.denomination);
}

/** Default title from the identifying fields, e.g. "2 € · Almanya · 2006". */
export function suggestTitle(
  denomination: string | null | undefined,
  countryName: string | null | undefined,
  year: number | null | undefined,
): string {
  return suggestTitleFromValue(denominationLabel(denomination), countryName, year);
}

/** The same from a value label of either kind, e.g. "25 kuruş · Türkiye · 1975". */
export function suggestTitleFromValue(
  valueLabel: string | null | undefined,
  countryName: string | null | undefined,
  year: number | null | undefined,
): string {
  return [valueLabel ?? '', countryName ?? '', year ? String(year) : '']
    .filter((part) => part.length > 0)
    .join(' · ');
}

/** "Ulusal yüz" / "Ortak yüz" for a euro coin, "Ön yüz" / "Arka yüz" for an other coin. */
export function sideLabelKey(kind: CoinKind | null | undefined, side: CoinSide): string {
  return kind === 'Other' ? `coin.otherSide.${side}.label` : `coin.side.${side}.label`;
}

export function sideHintKey(kind: CoinKind | null | undefined, side: CoinSide): string {
  return kind === 'Other' ? `coin.otherSide.${side}.hint` : `coin.side.${side}.hint`;
}
