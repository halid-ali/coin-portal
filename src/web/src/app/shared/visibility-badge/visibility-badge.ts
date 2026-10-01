import { Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { CollectionVisibility } from '../../core/collections/collection.models';

/**
 * Small pill with an icon: private (lock), link only (link), public (globe), or hidden by an
 * admin (shield; the collection is private then and cannot be shared until the lock is lifted).
 */
@Component({
  selector: 'app-visibility-badge',
  imports: [TranslocoPipe],
  // Rounded like the pill, so a shadow given from outside (collection card) follows its shape
  host: { class: 'inline-flex rounded-full' },
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1"
      [class]="tone()"
      [title]="'visibility.' + state() + '.description' | transloco"
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
        @switch (state()) {
          @case ('locked') {
            <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3z" />
            <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
          }
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
      {{ 'visibility.' + state() + '.label' | transloco }}
    </span>
  `,
})
export class VisibilityBadge {
  readonly visibility = input.required<CollectionVisibility>();
  /** Hidden by an admin: shown instead of the visibility. */
  readonly moderationLocked = input(false);

  protected readonly state = computed(() =>
    this.moderationLocked() ? 'locked' : this.visibility(),
  );

  protected readonly tone = computed(() => {
    switch (this.state()) {
      case 'locked':
        return 'bg-danger-50 text-danger-800 ring-danger-200';
      case 'Public':
        return 'bg-success-50 text-success-800 ring-success-200';
      case 'Unlisted':
        return 'bg-info-50 text-info-800 ring-info-200';
      default:
        return 'bg-shade-100 text-shade-600 ring-shade-200';
    }
  });
}
