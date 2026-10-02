import { Coin, CoinListQuery } from '../coins/coin.models';
import { CollectionSummary } from '../collections/collection.models';

// Public responses carry the user name only, never other personal data.

/** A collection as others see it (public, or opened with its share link). */
export interface PublicCollection extends CollectionSummary {
  ownerUserName: string;
}

export interface PublicProfile {
  userName: string;
  collections: PublicCollection[];
}

/** A user with at least one public collection (explore user filter). */
export interface Collector {
  userName: string;
  collectionCount: number;
  coinCount: number;
}

/** A coin in Explore, with where it comes from. */
export interface ExploreCoin extends Coin {
  collectionName: string;
  ownerUserName: string;
}

export interface ExploreQuery extends CoinListQuery {
  /** Exact user name. */
  owner?: string;
}
