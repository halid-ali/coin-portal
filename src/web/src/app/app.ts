import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter } from 'rxjs';

import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';
import { PageWidthService } from './layout/page-width.service';

/** The address without query and fragment: filters, sort and paging stay on the same page. */
function pagePath(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslocoPipe, Header, Footer],
  templateUrl: './app.html',
})
export class App {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // Follows the routes from the first navigation on
    inject(PageWidthService);
    this.followPageChanges();
  }

  /** The skip link: focus moves into the content, without adding #main to the address. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  /**
   * A new page starts at the top, and focus moves to it: a screen reader announces the new
   * content instead of staying on the link that was used, and the next Tab is in the page.
   * Not on the first load, not when only the query changes (filters, paging), and the
   * browser's back/forward keeps its scroll position.
   */
  private followPageChanges(): void {
    const router = inject(Router);
    let previousPath: string | null = null;
    let fromHistory = false;

    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        fromHistory = event.navigationTrigger === 'popstate';
      }
    });

    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const path = pagePath(event.urlAfterRedirects);
        const changed = previousPath !== null && path !== previousPath;
        previousPath = path;
        if (!changed) {
          return;
        }
        if (!fromHistory) {
          window.scrollTo({ top: 0 });
        }
        this.main().nativeElement.focus({ preventScroll: true });
      });
  }
}
