import { Component, computed, input, output } from '@angular/core';

export interface PageSizeOption {
  value: number;
  label: string;
}

let nextId = 0;

/** First / previous / current / next / last buttons plus a page size selector. */
@Component({
  selector: 'app-pagination',
  // Custom elements are inline by default; block lets the parent's spacing apply
  host: { class: 'block' },
  template: `
    <nav class="flex flex-wrap items-center justify-between gap-3" aria-label="Sayfalama">
      <div class="flex items-center gap-1">
        <button type="button" class="btn-icon" [disabled]="disabled() || isFirst()"
                (click)="pageChange.emit(1)" aria-label="İlk sayfa" title="İlk sayfa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          </svg>
        </button>
        <button type="button" class="btn-icon" [disabled]="disabled() || isFirst()"
                (click)="pageChange.emit(page() - 1)" aria-label="Önceki sayfa" title="Önceki sayfa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <span class="min-w-16 px-2 text-center text-sm font-medium text-slate-700" aria-current="page">
          {{ page() }} / {{ totalPages() }}
        </span>

        <button type="button" class="btn-icon" [disabled]="disabled() || isLast()"
                (click)="pageChange.emit(page() + 1)" aria-label="Sonraki sayfa" title="Sonraki sayfa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button type="button" class="btn-icon" [disabled]="disabled() || isLast()"
                (click)="pageChange.emit(totalPages())" aria-label="Son sayfa" title="Son sayfa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 17l5-5-5-5M6 17l5-5-5-5" />
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-3 text-sm text-slate-600">
        <span>{{ range() }} / {{ totalCount() }}</span>
        <label [for]="selectId" class="font-medium text-slate-700">Sayfa başına</label>
        <select [id]="selectId" #sizeSelect class="form-input w-auto py-1.5" [disabled]="disabled()"
                (change)="pageSizeChange.emit(+sizeSelect.value)">
          @for (option of options(); track option.value) {
            <option [value]="option.value" [selected]="option.value === pageSize()">{{ option.label }}</option>
          }
        </select>
      </div>
    </nav>
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalCount = input.required<number>();
  /** 0 means all items on one page. */
  readonly pageSize = input.required<number>();
  readonly options = input.required<readonly PageSizeOption[]>();
  readonly disabled = input(false);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  // Unique per instance, the component is rendered above and below the list
  protected readonly selectId = `page-size-${++nextId}`;

  protected readonly isFirst = computed(() => this.page() <= 1);
  protected readonly isLast = computed(() => this.page() >= this.totalPages());

  /** e.g. "11–20" */
  protected readonly range = computed(() => {
    const total = this.totalCount();
    if (total === 0) {
      return '0';
    }
    const size = this.pageSize() || total;
    const start = (this.page() - 1) * size + 1;
    const end = Math.min(this.page() * size, total);
    return `${start}–${end}`;
  });
}