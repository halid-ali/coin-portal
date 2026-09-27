import { Component, input, output } from '@angular/core';

export type CollectionView = 'list' | 'grid';

/** Two icon buttons that switch the collection between list and grid view. */
@Component({
  selector: 'app-view-toggle',
  host: { class: 'block' },
  template: `
    <div
      class="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm"
      role="group"
      aria-label="Görünüm"
    >
      @for (option of options; track option.value) {
        <button
          type="button"
          class="inline-flex size-8 items-center justify-center rounded-md transition-colors
                focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          [class]="
            option.value === value()
              ? 'bg-amber-100 text-amber-800'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          "
          [attr.aria-pressed]="option.value === value()"
          [attr.aria-label]="option.label"
          [title]="option.label"
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

  protected readonly options: readonly { value: CollectionView; label: string }[] = [
    { value: 'list', label: 'Liste görünümü' },
    { value: 'grid', label: 'Izgara görünümü' },
  ];
}
