import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export type CollectionView = 'list' | 'grid';

/** Two icon buttons that switch the collection between list and grid view. */
@Component({
  selector: 'app-view-toggle',
  imports: [TranslocoPipe],
  host: { class: 'block' },
  template: `
    <div
      class="inline-flex rounded-lg border border-shade-300 bg-shade-0 p-0.5 shadow-sm"
      role="group"
      [attr.aria-label]="'view.group' | transloco"
    >
      @for (option of options; track option.value) {
        <button
          type="button"
          class="inline-flex size-8 items-center justify-center rounded-md transition-colors
                focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          [class]="
            option.value === value()
              ? 'bg-brand-100 text-brand-800'
              : 'text-shade-500 hover:bg-shade-100 hover:text-shade-700'
          "
          [attr.aria-pressed]="option.value === value()"
          [attr.aria-label]="option.labelKey | transloco"
          [title]="option.labelKey | transloco"
          (click)="valueChange.emit(option.value)"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            @if (option.value === 'list') {
              <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
            } @else {
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            }
          </svg>
        </button>
      }
    </div>
  `,
})
export class ViewToggle {
  readonly value = input.required<CollectionView>();
  readonly valueChange = output<CollectionView>();

  protected readonly options: readonly { value: CollectionView; labelKey: string }[] = [
    { value: 'list', labelKey: 'view.list' },
    { value: 'grid', labelKey: 'view.grid' },
  ];
}
