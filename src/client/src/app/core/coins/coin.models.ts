/** Mirrors the API's Denomination enum (serialized as names). */
export type Denomination =
  'Cent1' | 'Cent2' | 'Cent5' | 'Cent10' | 'Cent20' | 'Cent50' | 'Euro1' | 'Euro2';

/** Largest first, the order used in selects and labels. */
export const DENOMINATIONS: readonly { value: Denomination; label: string }[] = [
  { value: 'Euro2', label: '2 €' },
  { value: 'Euro1', label: '1 €' },
  { value: 'Cent50', label: '50 cent' },
  { value: 'Cent20', label: '20 cent' },
  { value: 'Cent10', label: '10 cent' },
  { value: 'Cent5', label: '5 cent' },
  { value: 'Cent2', label: '2 cent' },
  { value: 'Cent1', label: '1 cent' },
];

/** Mirrors the API's CoinSort enum. 'Newest' is the default and has no direction. */
export type CoinSort =
  | 'Newest'
  | 'Title'
  | 'Denomination'
  | 'Country'
  | 'Year'
  | 'MintMark'
  | 'Commemorative'
  | 'Quantity';

export type SortDirection = 'Asc' | 'Desc';

export type CoinSortColumn = Exclude<CoinSort, 'Newest'>;

/** Sortable table columns with the wording of each direction (used by the mobile select). */
export const COIN_SORT_COLUMNS: readonly {
  value: CoinSortColumn;
  label: string;
  asc: string;
  desc: string;
}[] = [
  { value: 'Title', label: 'Başlık', asc: 'A → Z', desc: 'Z → A' },
  { value: 'Denomination', label: 'Nominal', asc: 'küçükten büyüğe', desc: 'büyükten küçüğe' },
  { value: 'Country', label: 'Ülke', asc: 'A → Z', desc: 'Z → A' },
  { value: 'Year', label: 'Yıl', asc: 'eskiden yeniye', desc: 'yeniden eskiye' },
  { value: 'MintMark', label: 'Darphane', asc: 'A → Z', desc: 'Z → A' },
  { value: 'Commemorative', label: 'Hatıra', asc: 'önce diğerleri', desc: 'önce hatıralar' },
  { value: 'Quantity', label: 'Adet', asc: 'azdan çoğa', desc: 'çoktan aza' },
];

export function isSortColumn(value: string | null | undefined): value is CoinSortColumn {
  return COIN_SORT_COLUMNS.some((c) => c.value === value);
}

/** 0 means "all items on one page" (the API accepts pageSize=0). */
export const PAGE_SIZE_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 0, label: 'Tümü' },
];

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
  createdAtUtc: string;
  updatedAtUtc: string;
}

/**
 * Mirrors the API's CoinSide enum, in euro coin terms. "Ön/arka yüz" is avoided on purpose:
 * people use it for either side. The national side identifies the coin, so it comes first.
 */
export type CoinSide = 'National' | 'Common';

export const COIN_SIDES: readonly { value: CoinSide; label: string; hint: string }[] = [
  { value: 'National', label: 'Ulusal yüz', hint: 'Ülkeye özgü taraf' },
  { value: 'Common', label: 'Ortak yüz', hint: 'Değerin yazdığı, tüm ülkelerde aynı taraf' },
];

export interface CoinPhoto {
  side: CoinSide;
  /** Changes on every upload; used as the cache version in photo URLs. */
  id: string;
}

/** Stored renditions: 150 px, 600 px, up to 1600 px (square WebP). */
export type PhotoSize = 'thumb' | 'preview' | 'full';

/** Same limits as the API (PhotoStorage options). */
export const PHOTO_LIMITS = {
  maxUploadBytes: 10 * 1024 * 1024,
  minPixels: 150,
  /** Longest edge sent to the API; the server never stores more. */
  maxPixels: 1600,
  acceptedTypes: ['image/jpeg', 'image/png'],
} as const;

export interface CoinUpsertRequest {
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
