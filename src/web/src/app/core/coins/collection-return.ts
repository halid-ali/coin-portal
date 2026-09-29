import { Injectable, signal } from '@angular/core';

/**
 * Remembers the last collection page URL (collection, view, filters, sort, page) so the coin
 * form can return to exactly that list. In memory only: after a reload the form falls back to
 * the coin's collection.
 */
@Injectable({ providedIn: 'root' })
export class CollectionReturn {
  private readonly lastUrl = signal<string | null>(null);

  /** e.g. "/collections/5?view=grid&page=2", or null if no collection page was opened yet. */
  readonly url = this.lastUrl.asReadonly();

  remember(url: string): void {
    this.lastUrl.set(url);
  }
}
