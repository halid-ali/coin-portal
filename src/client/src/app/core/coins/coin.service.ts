import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Coin, CoinListQuery, CoinUpsertRequest, PagedResponse } from './coin.models';

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
}