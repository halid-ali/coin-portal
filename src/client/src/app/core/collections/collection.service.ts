import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { photoUrl } from '../coins/coin.service';
import { PhotoSize } from '../coins/coin.models';
import { Collection, CollectionSummary, CollectionUpsertRequest } from './collection.models';

const BASE_URL = '/api/collections';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly http = inject(HttpClient);

  /** The user's collections, oldest (the default one) first. */
  list(): Observable<Collection[]> {
    return this.http.get<Collection[]>(BASE_URL);
  }

  get(id: number): Observable<Collection> {
    return this.http.get<Collection>(`${BASE_URL}/${id}`);
  }

  create(request: CollectionUpsertRequest): Observable<Collection> {
    return this.http.post<Collection>(BASE_URL, request);
  }

  update(id: number, request: CollectionUpsertRequest): Observable<Collection> {
    return this.http.put<Collection>(`${BASE_URL}/${id}`, request);
  }

  /** New share link for an Unlisted collection; the old one stops working. */
  regenerateShareToken(id: number): Observable<{ shareToken: string }> {
    return this.http.post<{ shareToken: string }>(`${BASE_URL}/${id}/share-token`, null);
  }

  /** Uploads or replaces the cover; the API crops it to 16:9 and re-encodes it. */
  uploadCover(id: number, image: Blob): Observable<{ collectionId: number; coverImageId: string }> {
    const body = new FormData();
    body.append('file', image, 'cover');
    return this.http.put<{ collectionId: number; coverImageId: string }>(
      `${BASE_URL}/${id}/cover`,
      body,
    );
  }

  deleteCover(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}/cover`);
  }

  /** With moveTo the coins move there first; without it they are deleted with the collection. */
  delete(id: number, moveTo?: number): Observable<void> {
    const params = moveTo === undefined ? undefined : new HttpParams().set('moveTo', moveTo);
    return this.http.delete<void>(`${BASE_URL}/${id}`, { params });
  }
}

/** URL of the uploaded cover (versioned by its id); the share secret opens unlisted ones. */
export function uploadedCoverUrl(
  collectionId: number,
  coverImageId: string,
  shareToken?: string | null,
): string {
  const url = `${BASE_URL}/${collectionId}/cover?v=${coverImageId}`;
  return shareToken ? `${url}&s=${encodeURIComponent(shareToken)}` : url;
}

/** Card image: the uploaded cover, otherwise the latest coin photo in the given size. */
export function coverUrl(
  collection: CollectionSummary,
  size: PhotoSize,
  shareToken?: string | null,
): string | null {
  if (collection.coverImageId) {
    return uploadedCoverUrl(collection.id, collection.coverImageId, shareToken);
  }
  const cover = collection.cover;
  return cover
    ? photoUrl(cover.coinId, { side: cover.side, id: cover.id }, size, shareToken)
    : null;
}

/** Absolute links others can open: the public page or the secret share link. */
export function shareLink(
  collection: Pick<Collection, 'id' | 'visibility' | 'shareToken'>,
  ownerUserName: string,
): string | null {
  const origin = window.location.origin;
  if (collection.visibility === 'Public') {
    return `${origin}/u/${encodeURIComponent(ownerUserName)}/${collection.id}`;
  }
  if (collection.visibility === 'Unlisted' && collection.shareToken) {
    return `${origin}/s/${collection.shareToken}`;
  }
  return null;
}

/** Turkish messages for the API's collection error codes. */
export function collectionErrorMessage(err: HttpErrorResponse): string {
  const code = (err.error as { code?: string } | null)?.code;
  switch (code) {
    case 'last_collection':
      return 'Tek koleksiyonun silinemez. Önce yeni bir koleksiyon oluştur.';
    case 'invalid_target':
      return "Coin'lerin taşınacağı koleksiyon geçerli değil.";
    case 'not_unlisted':
      return 'Link sadece "Sadece linkle" paylaşılan koleksiyonlarda yenilenebilir.';
  }
  if (err.status === 404) {
    return 'Koleksiyon bulunamadı. Silinmiş olabilir.';
  }
  return err.status === 0
    ? 'Sunucuya ulaşılamıyor. Bağlantını kontrol et.'
    : 'Beklenmeyen bir hata oluştu. Lütfen tekrar dene.';
}

/** For applyServerErrors: the duplicate name error belongs to the name field. */
export const COLLECTION_ERROR_CODES = { DuplicateName: 'name' } as const;
export const COLLECTION_ERROR_MESSAGES = {
  DuplicateName: 'Bu adla bir koleksiyonun zaten var.',
} as const;
