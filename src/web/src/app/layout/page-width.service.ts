import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Route data of pages that need more room than the reading width, e.g. the admin panel. */
export interface PageWidthData {
  pageWidth?: 'wide';
}

/**
 * Sets data-page-width="wide" on <html> while a route of the current page asks for it
 * (data: { pageWidth: 'wide' }); styles.css turns that into --page-max-width, which header,
 * main and footer share (.page-container). The layout itself knows no page names.
 */
@Injectable({ providedIn: 'root' })
export class PageWidthService {
  private readonly root = inject(DOCUMENT).documentElement;

  constructor() {
    const router = inject(Router);
    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.apply(router.routerState.snapshot.root));
  }

  private apply(route: ActivatedRouteSnapshot): void {
    let wide = false;
    for (let r: ActivatedRouteSnapshot | null = route; r; r = r.firstChild) {
      wide ||= (r.data as PageWidthData).pageWidth === 'wide';
    }
    if (wide) {
      this.root.setAttribute('data-page-width', 'wide');
    } else {
      this.root.removeAttribute('data-page-width');
    }
  }
}
