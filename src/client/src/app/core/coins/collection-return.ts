import { Injectable, signal } from '@angular/core';
import { Params } from '@angular/router';

/**
 * Remembers the collection page's query params (view, filters, sort, page) so the coin form
 * can return to exactly that list. In memory only: after a reload the plain list is used.
 */
@Injectable({ providedIn: 'root' })
export class CollectionReturn {
  private readonly params = signal<Params>({});

  /** Query params for links and navigation back to the collection. */
  readonly queryParams = this.params.asReadonly();

  remember(params: Params): void {
    this.params.set(params);
  }
}
