/** Mirrors the API's Denomination enum (serialized as names). */
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
  minYear: 1999,
  maxQuantity: 999,
} as const;

/** Mints sometimes release next year's coins in December. */
export function maxCoinYear(now = new Date()): number {
  return now.getFullYear() + 1;
}

export interface Coin {
  id: number;
  collectionId: number;
  title: string;
  description: string | null;
  denomination: Denomination;
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
 * identifies the coin, so it comes first. Texts: coin.side.<value>.label / .hint.
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

export interface CoinUpsertRequest {
  /** A different collection on update moves the coin. */
  collectionId: number;
  title: string;
  description: string | null;
  denomination: Denomination;
  countryCode: string;
  year: number;
  mintMark: string | null;
  isCommemorative: boolean;
  quantity: number;
}

export interface CoinListQuery {
  collectionId?: number;
  denomination?: Denomination;
  countryCode?: string;
  year?: number;
  isCommemorative?: boolean;
  search?: string;
  sort?: CoinSort;
  dir?: SortDirection;
  /** Comma-separated country codes in display order; the API sorts countries by it. */
  countryOrder?: string;
  page?: number;
  pageSize?: number;
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
  name: string;
}
