/**
 * Mirrors the API's CoinKind enum. A euro coin has a denomination, an other coin a face value in a
 * currency the user writes. Texts: coin.kind.<value>.label / .description.
 */
export type CoinKind = 'Euro' | 'Other';

export const COIN_KINDS: readonly CoinKind[] = ['Euro', 'Other'];

/** Mirrors the API's Denomination enum (serialized as names); euro coins only. */
export type Denomination =
  'Cent1' | 'Cent2' | 'Cent5' | 'Cent10' | 'Cent20' | 'Cent50' | 'Euro1' | 'Euro2';

/** Largest first, the order used in selects. Labels: coin.denomination.<value> (denominationLabel). */
export const DENOMINATIONS: readonly Denomination[] = [
  'Euro2',
  'Euro1',
  'Cent50',
  'Cent20',
  'Cent10',
  'Cent5',
  'Cent2',
  'Cent1',
];

/** Mirrors the API's CoinSort enum. 'Newest' is the default and has no direction. */
export type CoinSort = 'Newest' | 'Title' | 'Denomination' | 'Country' | 'Year';

export type SortDirection = 'Asc' | 'Desc';

export type CoinSortColumn = Exclude<CoinSort, 'Newest'>;

/**
 * Sortable table columns in table order (the mint mark, commemorative and quantity columns after
 * them do not sort, user choice). labelKey is the full field name (sort select); table headers use the shorter
 * coin.column.<value>, sized to the fixed column widths. The wording of each direction is
 * coin.sort.<value>.asc / .desc.
 */
export const COIN_SORT_COLUMNS: readonly { value: CoinSortColumn; labelKey: string }[] = [
  { value: 'Title', labelKey: 'coin.field.title' },
  { value: 'Denomination', labelKey: 'coin.field.denomination' },
  { value: 'Country', labelKey: 'coin.field.country' },
  { value: 'Year', labelKey: 'coin.field.year' },
];

export function isSortColumn(value: string | null | undefined): value is CoinSortColumn {
  return COIN_SORT_COLUMNS.some((c) => c.value === value);
}

/** 0 means "all items on one page" (the API accepts pageSize=0). */
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 0];

export const DEFAULT_PAGE_SIZE = 10;

/** Same limits as the API (Coin constants and CoinUpsertRequest). */
export const COIN_LIMITS = {
  titleMaxLength: 100,
  descriptionMaxLength: 2000,
  mintMarkMaxLength: 10,
  currencyMaxLength: 30,
  /** Euro coins are dated 1999 or later. */
  minYear: 1999,
  /** Other coins: no dates before the common era. */
  otherMinYear: 1,
  /** An other coin's face value: above 0, at most this, up to faceValueDecimals decimals. */
  maxFaceValue: 1_000_000_000_000,
  faceValueDecimals: 4,
  maxQuantity: 999,
} as const;

/**
 * Mints sometimes release next year's coins in December. The UTC year, as in the API, so both
 * agree on New Year's Eve.
 */
export function maxCoinYear(now = new Date()): number {
  return now.getUTCFullYear() + 1;
}

export interface Coin {
  id: number;
  collectionId: number;
  title: string;
  description: string | null;
  kind: CoinKind;
  /** Euro coins only. */
  denomination: Denomination | null;
  /** Other coins only, e.g. 25 (kuruş) or 0.5 (penny). */
  faceValue: number | null;
  currency: string | null;
  countryCode: string;
  year: number;
  mintMark: string | null;
  isCommemorative: boolean;
  quantity: number;
  /** At most one per side, national side first. */
  photos: CoinPhoto[];
}

/**
 * Mirrors the API's CoinSide enum, in euro coin terms (ECB: national side / common side).
 * "Obverse/reverse" is avoided on purpose: people use it for either side. The national side
 * identifies the coin, so it comes first. An other coin calls them front and back (same values).
 * Texts: sideLabelKey / sideHintKey (shared/coin-format).
 */
export type CoinSide = 'National' | 'Common';

export const COIN_SIDES: readonly CoinSide[] = ['National', 'Common'];

export interface CoinPhoto {
  side: CoinSide;
  /** Changes on every upload; used as the cache version in photo URLs. */
  id: string;
}

/** Stored renditions: 150 px, 600 px, up to 1600 px (square WebP). */
export type PhotoSize = 'thumb' | 'preview' | 'full';

/**
 * Same limits as the API (PhotoStorage options). They apply to what is uploaded: the cropped
 * JPEG (at most maxPixels wide), not the file the user picks, which can be a 50 MP phone photo.
 */
export const PHOTO_LIMITS = {
  maxUploadBytes: 10 * 1024 * 1024,
  minPixels: 150,
  /** Longest edge sent to the API; the server never stores more. */
  maxPixels: 1600,
} as const;

/** The fields both kinds share. */
interface CoinUpsertFields {
  /** A different collection on update moves the coin. */
  collectionId: number;
  title: string;
  description: string | null;
  countryCode: string;
  year: number;
  mintMark: string | null;
  isCommemorative: boolean;
  quantity: number;
}

/**
 * A euro coin is sent without a kind, as before other coins existed (the API reads a missing kind
 * as euro); an other coin names its kind.
 */
export type CoinUpsertRequest =
  | (CoinUpsertFields & { denomination: Denomination })
  | (CoinUpsertFields & { kind: 'Other'; faceValue: number; currency: string });

export interface CoinListQuery {
  collectionId?: number;
  kind?: CoinKind;
  denomination?: Denomination;
  /** Other coins in this currency (the API ignores case). */
  currency?: string;
  countryCode?: string;
  year?: number;
  isCommemorative?: boolean;
  /** With (true) or without (false) the photos a public collection needs (own coins only). */
  photographed?: boolean;
  search?: string;
  sort?: CoinSort;
  dir?: SortDirection;
  /** Comma-separated country codes in display order; the API sorts countries by it. */
  countryOrder?: string;
  page?: number;
  pageSize?: number;
}

/** Counts over all of the user's collections (GET api/coins/summary). */
export interface CoinSummary {
  coinCount: number;
  countryCount: number;
  commemorativeCount: number;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Country {
  code: string;
  /** English reference name; the client names countries itself (CountryService). */
  name: string;
  /** Issues euro coins: a euro coin can only come from these. */
  euroIssuer: boolean;
}

/**
 * What a coin list holds, for its filters (GET .../facets): coins per kind (the All / Euro / Other
 * buttons), the currencies of its other coins and the countries of the chosen kind.
 */
export interface CoinFacets {
  euroCount: number;
  otherCount: number;
  currencies: string[];
  countryCodes: string[];
}
