import { CoinSide } from '../coins/coin.models';

/** Same limits as the API (Collection constants). */
export const COLLECTION_LIMITS = {
  nameMaxLength: 100,
  descriptionMaxLength: 1000,
} as const;

/** Same as the API (CoverImage): 16:9, at least 320 px wide. */
export const COVER_LIMITS = {
  aspectRatio: 16 / 9,
  minWidth: 320,
} as const;

/** Mirrors the API enum. Private is the default for every collection. */
export type CollectionVisibility = 'Private' | 'Unlisted' | 'Public';

export const VISIBILITY_OPTIONS: readonly {
  value: CollectionVisibility;
  label: string;
  description: string;
}[] = [
  { value: 'Private', label: 'Özel', description: 'Sadece sen görürsün.' },
  {
    value: 'Unlisted',
    label: 'Sadece linkle',
    description: "Gizli linke sahip olan herkes görür; profilinde ve Keşfet'te görünmez.",
  },
  {
    value: 'Public',
    label: 'Herkese açık',
    description: "Herkes görür, giriş yapmadan da. Profilinde ve Keşfet'te görünür.",
  },
];

/** Photo shown on the collection card (a coin photo, see photoUrl). */
export interface CollectionCover {
  coinId: number;
  side: CoinSide;
  id: string;
}

/** What a collection card needs; shared by own and public collections. */
export interface CollectionSummary {
  id: number;
  name: string;
  description: string | null;
  visibility: CollectionVisibility;
  coinCount: number;
  /** Uploaded cover; wins over the automatic one. */
  coverImageId: string | null;
  /** Latest coin photo, shown when there is no uploaded cover. */
  cover: CollectionCover | null;
}

export interface Collection extends CollectionSummary {
  /** Secret of the share link (/s/<token>) while Unlisted. */
  shareToken: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CollectionUpsertRequest {
  name: string;
  description: string | null;
  visibility: CollectionVisibility;
}
