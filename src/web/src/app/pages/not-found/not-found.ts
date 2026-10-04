import { Component, DestroyRef, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Any address no route matches ('**'), instead of a silent jump to the home page: a mistyped or
 * cut-off link (often a share link) says so. The server answers these addresses with index.html
 * and 200 (SPA fallback), so the page asks search engines not to index it.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslocoPipe],
  host: { class: 'block' },
  template: `
    <div class="card mx-auto max-w-xl text-center">
      <p class="text-5xl font-semibold text-shade-300" aria-hidden="true">404</p>
      <h1 class="mt-2 text-xl font-semibold text-shade-900">{{ 'notFound.title' | transloco }}</h1>
      <p class="mt-2 text-shade-600">{{ 'notFound.message' | transloco }}</p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a routerLink="/" class="btn-primary">{{ 'notFound.home' | transloco }}</a>
        <a routerLink="/explore" class="btn-secondary">{{ 'common.goToExplore' | transloco }}</a>
      </div>
    </div>
  `,
})
export class NotFound {
  constructor() {
    const meta = inject(Meta);
    meta.addTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
  }
}
