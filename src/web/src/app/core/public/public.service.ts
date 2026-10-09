import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Coin, CoinFacets, CoinKind, CoinListQuery, PagedResponse } from '../coins/coin.models';
import { toListParams } from '../coins/coin.service';
import {
  Collector,
  ExploreCoin,
  ExploreQuery,
  PublicCollection,
  PublicProfile,
} from './public.models';

const BASE_URL = '/api/public';

/** Read-only views that work signed out (api/public). */
@Injectable({ providedIn: 'root' })
export class PublicService {
  private readonly http = inject(HttpClient);

  collectors(): Observable<Collector[]> {
    return this.http.get<Collector[]>(`${BASE_URL}/collectors`);
  }

  profile(userName: string): Observable<PublicProfile> {
    return this.http.get<PublicProfile>(`${BASE_URL}/users/${encodeURIComponent(userName)}`);
  }

  collection(id: number): Observable<PublicCollection> {
    return this.http.get<PublicCollection>(`${BASE_URL}/collections/${id}`);
  }

  collectionCoins(id: number, query: CoinListQuery): Observable<PagedResponse<Coin>> {
    return this.http.get<PagedResponse<Coin>>(`${BASE_URL}/collections/${id}/coins`, {
      params: toListParams(query),
    });
  }

  shared(token: string): Observable<PublicCollection> {
    return this.http.get<PublicCollection>(`${BASE_URL}/shared/${encodeURIComponent(token)}`);
  }

  sharedCoins(token: string, query: CoinListQuery): Observable<PagedResponse<Coin>> {
    return this.http.get<PagedResponse<Coin>>(
      `${BASE_URL}/shared/${encodeURIComponent(token)}/coins`,
      { params: toListParams(query) },
    );
  }

  explore(query: ExploreQuery): Observable<PagedResponse<ExploreCoin>> {
    return this.http.get<PagedResponse<ExploreCoin>>(`${BASE_URL}/coins`, {
      params: toListParams(query),
    });
  }

  // Kinds, currencies and countries for the filters (CoinFacets), like their coin lists

  collectionFacets(id: number, kind?: CoinKind): Observable<CoinFacets> {
    return this.http.get<CoinFacets>(`${BASE_URL}/collections/${id}/facets`, {
      params: toListParams({ kind }),
    });
  }

  sharedFacets(token: string, kind?: CoinKind): Observable<CoinFacets> {
    return this.http.get<CoinFacets>(`${BASE_URL}/shared/${encodeURIComponent(token)}/facets`, {
      params: toListParams({ kind }),
    });
  }

  exploreFacets(owner?: string, kind?: CoinKind): Observable<CoinFacets> {
    return this.http.get<CoinFacets>(`${BASE_URL}/coins/facets`, {
      params: toListParams({ owner, kind }),
    });
  }
}
