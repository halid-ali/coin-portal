import { Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { SortDirection } from '../../core/coins/coin.models';

/**
 * Sortable table header cell: the label with a sort button right next to it.
 * The icon shows the current state (neutral, ascending, descending); the host
 * <th> gets aria-sort so screen readers announce the order.
 */
@Component({
  selector: 'th[appSortHeader]',
  imports: [TranslocoPipe],
  host: {
    scope: 'col',
    '[attr.aria-sort]': 'ariaSort()',
  },
  template: `
    <button
      type="button"
      class="group -mx-1.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1 font-medium transition-colors hover:text-shade-900 focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none"
      [class.text-shade-900]="direction()"
      [title]="hint() | transloco"
      (click)="toggle.emit()"
    >
      <span>{{ label() }}</span>
      <span
        class="inline-flex size-5 items-center justify-center rounded transition-colors"
        [class]="iconClass()"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          class="size-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          @switch (direction()) {
            @case ('Asc') {
              <path d="M8 12.5v-9M4.75 6.75 8 3.5l3.25 3.25" />
            }
            @case ('Desc') {
              <path d="M8 3.5v9M4.75 9.25 8 12.5l3.25-3.25" />
            }
            @default {
              <path d="M5.25 6 8 3.25 10.75 6M5.25 10 8 12.75 10.75 10" />
            }
          }
        </svg>
      </span>
    </button>
  `,
})
export class SortHeader {
  readonly label = input.required<string>();
  /** Null when the table is sorted by another column. */
  readonly direction = input<SortDirection | null>(null);
  /** What the first click on an inactive column does (only the tooltip; the parent sorts). */
  readonly firstDirection = input<SortDirection>('Asc');
  /** Descending goes back to the default order (true) or flips to ascending (false). */
  readonly clearable = input(true);
  readonly toggle = output<void>();

  protected readonly ariaSort = computed(() => {
    const dir = this.direction();
    return dir === 'Asc' ? 'ascending' : dir === 'Desc' ? 'descending' : 'none';
  });

  // Active: amber badge; inactive: muted icon that lights up on hover
  protected readonly iconClass = computed(() =>
    this.direction()
      ? 'bg-brand-100 text-brand-700'
      : 'text-shade-400 group-hover:bg-shade-200/70 group-hover:text-shade-600',
  );

  /** Tooltip (translation key) describing what the next click does. */
  protected readonly hint = computed(() => {
    switch (this.direction()) {
      case 'Asc':
        return 'sort.descending';
      case 'Desc':
        return this.clearable() ? 'sort.clear' : 'sort.ascending';
      default:
        return this.firstDirection() === 'Asc' ? 'sort.ascending' : 'sort.descending';
    }
  });
}
