import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Remembers the last Explore address (filters, sort, page) so the "Explore" step of the
 * breadcrumbs on a profile or a public collection returns to exactly that list. In memory only,
 * like CollectionReturn: after a reload, or arriving from outside, it is plain Explore.
 */
@Injectable({ providedIn: 'root' })
export class ExploreReturn {
  private readonly router = inject(Router);
  private readonly lastUrl = signal<string | null>(null);

  /** The remembered list, otherwise plain Explore. */
  readonly link = computed(() => this.router.parseUrl(this.lastUrl() ?? '/explore'));

  /** e.g. "/explore?country=DE&page=2". */
  remember(url: string): void {
    this.lastUrl.set(url);
  }
}
