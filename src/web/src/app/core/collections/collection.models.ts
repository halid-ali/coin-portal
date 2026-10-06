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
  /** Owner's view only: hidden by an admin (see Collection). */
  moderationLocked?: boolean;
}

export interface Collection extends CollectionSummary {
  /** Hidden by an admin: Private, and the visibility cannot change until the lock is lifted. */
  moderationLocked: boolean;
  /** Secret of the share link (/s/<token>) while Unlisted. */
  shareToken: string | null;
  /** Coins with the photos a public collection needs (a national side photo). */
  photographedCoinCount: number;
  /** Photographed coins a collection needs to become Public (site setting, the same for all). */
  minPublicCoins: number;
  /** Meets the rule of a public collection now; the API decides, the counts are for display. */
  canBePublic: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CollectionUpsertRequest {
  name: string;
  description: string | null;
  visibility: CollectionVisibility;
}
