import { HttpErrorResponse } from '@angular/common/http';

import { Collection } from './collection.models';

/**
 * Where a collection stands against the rule of public collections (API: PublicationRules: a
 * national side photo of every coin and at least `minPublicCoins` such coins, counted in coin
 * rows). The API decides (`canBePublic`); the counts only say what is missing.
 */
export interface PublicationProgress {
  photographed: number;
  required: number;
  /** Coins without the photos a public collection needs. */
  missing: number;
  /** The collection may become Public now. */
  ready: boolean;
}

export function publicationProgress(
  collection: Pick<
    Collection,
    'coinCount' | 'photographedCoinCount' | 'minPublicCoins' | 'canBePublic'
  >,
): PublicationProgress {
  return {
    photographed: collection.photographedCoinCount,
    required: collection.minPublicCoins,
    missing: collection.coinCount - collection.photographedCoinCount,
    ready: collection.canBePublic,
  };
}

/**
 * Whether "Public" can be chosen: ready, or Public already (a raised minimum does not take a
 * collection down by itself). A new collection has no coins, so never.
 */
export function canChoosePublic(collection: Collection | null | undefined): boolean {
  return (
    !!collection && (collection.visibility === 'Public' || publicationProgress(collection).ready)
  );
}

/** A public collection that a change would make "link only" (409 would_unpublish). */
export interface UnpublishedCollection {
  id: number;
  name: string;
}

/** The collections of a 409 would_unpublish, or null for any other error. */
export function wouldUnpublish(err: unknown): UnpublishedCollection[] | null {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) {
    return null;
  }
  const body = err.error as { code?: string; collections?: UnpublishedCollection[] } | null;
  return body?.code === 'would_unpublish' ? (body.collections ?? []) : null;
}
