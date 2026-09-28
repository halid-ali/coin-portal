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

/** In the order shown in the form. Texts: visibility.<value>.label / .description. */
export const VISIBILITIES: readonly CollectionVisibility[] = ['Private', 'Unlisted', 'Public'];

/** What a collection card needs; shared by own and public collections. */
export interface CollectionSummary {
  id: number;
  name: string;
  description: string | null;
  visibility: CollectionVisibility;
  coinCount: number;
  /** Uploaded cover; without one the card shows the default picture (CollectionPlaceholder). */
  coverImageId: string | null;
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
