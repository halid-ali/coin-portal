import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { Observable } from 'rxjs';

import { httpErrorMessage } from '../http/problem-details';
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

  /**
   * Makes the collection public, nothing else (400 public_requirements with the current counts
   * while the rule is not met). An unlisted collection loses its share link.
   */
  publish(id: number): Observable<Collection> {
    return this.http.post<Collection>(`${BASE_URL}/${id}/publish`, null);
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

  /**
   * Deletes a collection: its coins move to `moveTo`, or go with it only when `deleteCoins` says
   * so (the API answers 409 has_coins for a collection with coins and neither). `unpublish`: a
   * public target that coins without photos would break becomes "link only".
   */
  delete(
    id: number,
    options: { moveTo?: number; deleteCoins?: boolean; unpublish?: boolean } = {},
  ): Observable<void> {
    let params = new HttpParams();
    if (options.moveTo !== undefined) {
      params = params.set('moveTo', options.moveTo);
      if (options.unpublish) {
        params = params.set('unpublish', true);
      }
    } else if (options.deleteCoins) {
      params = params.set('deleteCoins', true);
    }
    return this.http.delete<void>(`${BASE_URL}/${id}`, { params });
  }
}

/**
 * URL of the uploaded cover (versioned by its id), or null: then the default picture is shown
 * (CollectionPlaceholder). The share secret opens unlisted ones.
 */
export function coverUrl(
  collection: Pick<CollectionSummary, 'id' | 'coverImageId'>,
  shareToken?: string | null,
): string | null {
  if (!collection.coverImageId) {
    return null;
  }
  const url = `${BASE_URL}/${collection.id}/cover?v=${collection.coverImageId}`;
  return shareToken ? `${url}&s=${encodeURIComponent(shareToken)}` : url;
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

/** Messages for the API's collection error codes, in the active language. */
export function collectionErrorMessage(err: HttpErrorResponse): string {
  const code = (err.error as { code?: string } | null)?.code;
  switch (code) {
    case 'last_collection':
    case 'has_coins':
    case 'invalid_target':
    case 'not_unlisted':
    case 'moderation_locked':
      return translate(`collections.errors.${code}`);
  }
  if (err.status === 404) {
    return translate('collections.errors.notFound');
  }
  return httpErrorMessage(err);
}

/** For applyServerErrors: the duplicate name error belongs to the name field. */
export const COLLECTION_ERROR_CODES = { DuplicateName: 'name' } as const;
export const COLLECTION_ERROR_MESSAGE_KEYS = {
  DuplicateName: 'collections.errors.duplicateName',
  // Only spaces: the form checks "required", the API trims first
  Name: 'validation.required',
  // 403 when the collection was hidden by an admin while the form was open
  moderation_locked: 'collections.errors.moderation_locked',
  // Coins or photos changed in another tab since the form was opened
  public_requirements: 'publication.requirementsNotMet',
} as const;
