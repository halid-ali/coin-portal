import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { OPERATOR, PRIVACY_UPDATED } from '../../core/legal/operator';

/** A section of the policy: its title (privacy.<id>.title), then paragraphs and lists in order. */
interface Section {
  id: string;
  blocks: readonly { p?: string; list?: readonly string[] }[];
}

// The text itself is in the translation files (privacy.*); this is only its shape
const SECTIONS: readonly Section[] = [
  { id: 'controller', blocks: [{ p: 'p1' }] },
  { id: 'data', blocks: [{ list: ['i1', 'i2', 'i3', 'i4'] }] },
  { id: 'purposes', blocks: [{ list: ['i1', 'i2', 'i3'] }, { p: 'p1' }] },
  { id: 'visibility', blocks: [{ p: 'p1' }, { p: 'p2' }] },
  { id: 'cookies', blocks: [{ p: 'p1' }, { list: ['i1', 'i2'] }, { p: 'p2' }] },
  { id: 'hosting', blocks: [{ p: 'p1' }] },
  { id: 'retention', blocks: [{ p: 'p1' }] },
  { id: 'rights', blocks: [{ p: 'p1' }, { p: 'p2' }] },
  { id: 'age', blocks: [{ p: 'p1' }] },
  { id: 'changes', blocks: [{ p: 'p1' }] },
];

/** Privacy policy (/privacy), public. Linked from the footer and the sign-up form. */
@Component({
  selector: 'app-privacy',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <article class="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-shade-900">{{ 'privacy.title' | transloco }}</h1>
        <p class="mt-1 text-sm text-shade-500">
          {{ 'privacy.updated' | transloco: { date: updated() } }}
        </p>
      </header>

      <p class="text-shade-700">{{ 'privacy.intro' | transloco }}</p>

      @for (section of sections; track section.id) {
        <section class="space-y-2">
          <h2 class="text-lg font-semibold text-shade-900">
            {{ 'privacy.' + section.id + '.title' | transloco }}
          </h2>
          @for (block of section.blocks; track $index) {
            @if (block.p) {
              <p class="text-shade-700">
                {{
                  'privacy.' + section.id + '.' + block.p
                    | transloco
                      : {
                          name: operator.name ?? ('legal.notSet' | transloco),
                          email: operator.email ?? ('legal.notSet' | transloco),
                        }
                }}
              </p>
            } @else {
              <ul class="list-disc space-y-1.5 pl-5 text-shade-700">
                @for (item of block.list ?? []; track item) {
                  <li>{{ 'privacy.' + section.id + '.' + item | transloco }}</li>
                }
              </ul>
            }
          }
        </section>
      }

      <p class="text-sm text-shade-600">
        <a routerLink="/contact" class="link">{{ 'legal.contactLink' | transloco }}</a>
      </p>
    </article>
  `,
})
export class Privacy {
  private readonly language = inject(LanguageService);

  protected readonly sections = SECTIONS;

  protected readonly updated = computed(() =>
    new Intl.DateTimeFormat(this.language.current(), { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(PRIVACY_UPDATED + 'T00:00:00Z'),
    ),
  );

  protected readonly operator = OPERATOR;
}
