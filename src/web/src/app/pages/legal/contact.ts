import { Component, isDevMode } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { OPERATOR, SOURCE_URL } from '../../core/legal/operator';

/**
 * Contact (/contact), public: who runs the site and how to reach them. By e-mail only, there is no
 * form (the site sends no mail yet). The address is put together in the browser like every page
 * of the app, so it is not in any static HTML for address harvesters.
 */
@Component({
  selector: 'app-contact',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <article class="mx-auto max-w-3xl space-y-6">
      <h1 class="text-2xl font-semibold text-shade-900">{{ 'contact.title' | transloco }}</h1>
      <p class="text-shade-700">{{ 'contact.intro' | transloco }}</p>

      <dl class="card space-y-4">
        <div class="grid gap-x-6 gap-y-0.5 sm:grid-cols-[10rem_1fr]">
          <dt class="text-sm text-shade-500">{{ 'contact.operator' | transloco }}</dt>
          <dd class="font-medium wrap-break-word text-shade-900">{{ operator.name }}</dd>
        </div>

        <div class="grid gap-x-6 gap-y-0.5 sm:grid-cols-[10rem_1fr]">
          <dt class="text-sm text-shade-500">{{ 'contact.email' | transloco }}</dt>
          <dd class="min-w-0">
            <a [href]="'mailto:' + operator.email" class="link font-medium break-all">{{
              operator.email
            }}</a>
            <p class="form-hint">{{ 'contact.emailHint' | transloco }}</p>
          </dd>
        </div>

        <div class="grid gap-x-6 gap-y-0.5 sm:grid-cols-[10rem_1fr]">
          <dt class="text-sm text-shade-500">{{ 'contact.source' | transloco }}</dt>
          <dd class="min-w-0">
            <a
              [href]="sourceUrl"
              target="_blank"
              rel="noopener"
              class="link font-medium break-all"
              >{{ sourceUrl }}</a
            >
            <p class="form-hint">{{ 'contact.sourceHint' | transloco }}</p>
            @if (showLicenses) {
              <a href="/3rdpartylicenses.txt" target="_blank" rel="noopener" class="link text-sm">{{
                'contact.licenses' | transloco
              }}</a>
            }
          </dd>
        </div>
      </dl>

      <p class="text-sm text-shade-600">
        <a routerLink="/privacy" class="link">{{ 'legal.privacyLink' | transloco }}</a>
      </p>
    </article>
  `,
})
export class Contact {
  protected readonly operator = OPERATOR;
  protected readonly sourceUrl = SOURCE_URL;
  /**
   * The production build writes 3rdpartylicenses.txt (extractLicenses) and the published site serves
   * it; ng serve runs the development build, which has no such file, so there is no link to it.
   */
  protected readonly showLicenses = !isDevMode();
}
