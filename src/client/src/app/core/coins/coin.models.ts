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

export type CoinSort = 'Newest' | 'Denomination' | 'Country' | 'Year';

export const COIN_SORTS: readonly { value: CoinSort; label: string }[] = [
  { value: 'Newest', label: 'En yeni eklenen' },
  { value: 'Denomination', label: 'Nominal' },
  { value: 'Country', label: 'Ülke kodu' },
  { value: 'Year', label: 'Yıl' },
];

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
  createdAtUtc: string;
  updatedAtUtc: string;
}

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