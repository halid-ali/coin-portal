import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { TERMS_UPDATED } from '../../core/legal/operator';

/** A section of the terms: its title (terms.<id>.title), then paragraphs and lists in order. */
interface Section {
  id: string;
  blocks: readonly { p?: string; list?: readonly string[] }[];
}

// The text itself is in the translation files (terms.*); this is only its shape
const SECTIONS: readonly Section[] = [
  { id: 'service', blocks: [{ p: 'p1' }] },
  { id: 'account', blocks: [{ p: 'p1' }] },
  { id: 'content', blocks: [{ p: 'p1' }, { p: 'p2' }] },
  { id: 'rules', blocks: [{ p: 'p1' }, { list: ['i1', 'i2', 'i3', 'i4', 'i5'] }] },
  { id: 'moderation', blocks: [{ p: 'p1' }] },
  { id: 'objection', blocks: [{ p: 'p1' }] },
  { id: 'ending', blocks: [{ p: 'p1' }, { p: 'p2' }] },
  { id: 'changes', blocks: [{ p: 'p1' }] },
];

/**
 * Terms of use (/terms), public: the rules moderation acts on. Accepted at sign-up together with
 * the privacy policy; linked from the footer.
 */
@Component({
  selector: 'app-terms',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <article class="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-shade-900">{{ 'terms.title' | transloco }}</h1>
        <p class="mt-1 text-sm text-shade-500">
          {{ 'terms.updated' | transloco: { date: updated() } }}
        </p>
      </header>

      <p class="text-shade-700">{{ 'terms.intro' | transloco }}</p>

      @for (section of sections; track section.id) {
        <section class="space-y-2">
          <h2 class="text-lg font-semibold text-shade-900">
            {{ 'terms.' + section.id + '.title' | transloco }}
          </h2>
          @for (block of section.blocks; track $index) {
            @if (block.p) {
              <p class="text-shade-700">
                {{ 'terms.' + section.id + '.' + block.p | transloco }}
              </p>
            } @else {
              <ul class="list-disc space-y-1.5 pl-5 text-shade-700">
                @for (item of block.list ?? []; track item) {
                  <li>{{ 'terms.' + section.id + '.' + item | transloco }}</li>
                }
              </ul>
            }
          }
        </section>
      }

      <p class="text-sm text-shade-600">
        <a routerLink="/privacy" class="link">{{ 'legal.privacyLink' | transloco }}</a>
        ·
        <a routerLink="/contact" class="link">{{ 'legal.contactLink' | transloco }}</a>
      </p>
    </article>
  `,
})
export class Terms {
  private readonly language = inject(LanguageService);

  protected readonly sections = SECTIONS;

  protected readonly updated = computed(() =>
    new Intl.DateTimeFormat(this.language.current(), { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(TERMS_UPDATED + 'T00:00:00Z'),
    ),
  );
}
