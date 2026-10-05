import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Coin,
  CoinListQuery,
  CoinPhoto,
  CoinSide,
  CoinSummary,
  CoinUpsertRequest,
  PagedResponse,
  PhotoSize,
} from './coin.models';

const BASE_URL = '/api/coins';

/** Builds query string params, leaving out empty filters. */
export function toListParams(query: CoinListQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class CoinService {
  private readonly http = inject(HttpClient);

  list(query: CoinListQuery): Observable<PagedResponse<Coin>> {
    return this.http.get<PagedResponse<Coin>>(BASE_URL, { params: toListParams(query) });
  }

  /** Counts over all of the user's collections. */
  summary(): Observable<CoinSummary> {
    return this.http.get<CoinSummary>(`${BASE_URL}/summary`);
  }

  get(id: number): Observable<Coin> {
    return this.http.get<Coin>(`${BASE_URL}/${id}`);
  }

  create(request: CoinUpsertRequest): Observable<Coin> {
    return this.http.post<Coin>(BASE_URL, request);
  }

  update(id: number, request: CoinUpsertRequest): Observable<Coin> {
    return this.http.put<Coin>(`${BASE_URL}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }

  /** Uploads or replaces one side; the API crops, resizes and re-encodes it. */
  uploadPhoto(coinId: number, side: CoinSide, image: Blob): Observable<Coin> {
    const body = new FormData();
    body.append('file', image, 'photo');
    return this.http.put<Coin>(`${BASE_URL}/${coinId}/photos/${side.toLowerCase()}`, body);
  }

  deletePhoto(coinId: number, side: CoinSide): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${coinId}/photos/${side.toLowerCase()}`);
  }
}

/**
 * Image URL of a stored photo; the photo id as version keeps browser caching safe. The share
 * link secret opens photos of unlisted collections for other people.
 */
export function photoUrl(
  coinId: number,
  photo: CoinPhoto,
  size: PhotoSize,
  shareToken?: string | null,
): string {
  const url = `${BASE_URL}/${coinId}/photos/${photo.side.toLowerCase()}/${size}?v=${photo.id}`;
  return shareToken ? `${url}&s=${encodeURIComponent(shareToken)}` : url;
}

/** The photo shown for a coin in lists: the national side if there is one, otherwise the common side. */
export function primaryPhoto(coin: Pick<Coin, 'photos'>): CoinPhoto | undefined {
  return coin.photos.find((p) => p.side === 'National') ?? coin.photos[0];
}
