import { Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { CollectionVisibility } from '../../core/collections/collection.models';

/** Small pill with an icon: private (lock), link only (link), public (globe). */
@Component({
  selector: 'app-visibility-badge',
  imports: [TranslocoPipe],
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1"
      [class]="tone()"
      [title]="'visibility.' + visibility() + '.description' | transloco"
    >
      <svg
        viewBox="0 0 24 24"
        class="size-3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        @switch (visibility()) {
          @case ('Public') {
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          }
          @case ('Unlisted') {
            <path
              d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
            />
          }
          @default {
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          }
        }
      </svg>
      {{ 'visibility.' + visibility() + '.label' | transloco }}
    </span>
  `,
})
export class VisibilityBadge {
  readonly visibility = input.required<CollectionVisibility>();

  protected readonly tone = computed(() => {
    switch (this.visibility()) {
      case 'Public':
        return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
      case 'Unlisted':
        return 'bg-sky-50 text-sky-800 ring-sky-200';
      default:
        return 'bg-slate-100 text-slate-600 ring-slate-200';
    }
  });
}
