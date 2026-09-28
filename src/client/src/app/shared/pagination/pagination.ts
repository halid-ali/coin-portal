import { Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

let nextId = 0;

/**
 * Pagination bar in three parts: projected content on the left (e.g. view switch), first /
 * previous / current / next / last buttons in the middle, range and page size on the right.
 * On narrow screens left and right share a row and the buttons move below, centered.
 */
@Component({
  selector: 'app-pagination',
  imports: [TranslocoPipe],
  // Custom elements are inline by default; block lets the parent's spacing apply
  host: { class: 'block' },
  template: `
    <div class="grid grid-cols-2 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <div class="justify-self-start">
        <ng-content />
      </div>

      <nav
        class="order-last col-span-2 flex items-center justify-center gap-1 sm:order-none sm:col-span-1"
        [attr.aria-label]="'pagination.nav' | transloco"
      >
        <button
          type="button"
          class="btn-icon"
          [disabled]="disabled() || isFirst()"
          (click)="pageChange.emit(1)"
          [attr.aria-label]="'pagination.first' | transloco"
          [title]="'pagination.first' | transloco"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-4"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11 17l-5-5 5-5M18 17l-5-5 5-5"
            />
          </svg>
        </button>
        <button
          type="button"
          class="btn-icon"
          [disabled]="disabled() || isFirst()"
          (click)="pageChange.emit(page() - 1)"
          [attr.aria-label]="'pagination.previous' | transloco"
          [title]="'pagination.previous' | transloco"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-4"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <span
          class="min-w-16 px-2 text-center text-sm font-medium text-shade-700"
          aria-current="page"
        >
          {{ page() }} / {{ totalPages() }}
        </span>

        <button
          type="button"
          class="btn-icon"
          [disabled]="disabled() || isLast()"
          (click)="pageChange.emit(page() + 1)"
          [attr.aria-label]="'pagination.next' | transloco"
          [title]="'pagination.next' | transloco"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-4"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button
          type="button"
          class="btn-icon"
          [disabled]="disabled() || isLast()"
          (click)="pageChange.emit(totalPages())"
          [attr.aria-label]="'pagination.last' | transloco"
          [title]="'pagination.last' | transloco"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-4"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 17l5-5-5-5M6 17l5-5-5-5" />
          </svg>
        </button>
      </nav>

      <div class="flex items-center gap-3 justify-self-end text-sm text-shade-600">
        <span>{{ range() }} / {{ totalCount() }}</span>
        <label [for]="selectId" class="font-medium text-shade-700 max-sm:sr-only">{{
          'pagination.perPage' | transloco
        }}</label>
        <select
          [id]="selectId"
          #sizeSelect
          class="form-input w-auto py-1.5"
          [disabled]="disabled()"
          (change)="pageSizeChange.emit(+sizeSelect.value)"
        >
          @for (option of options(); track option) {
            <option [value]="option" [selected]="option === pageSize()">
              {{ option === 0 ? ('common.all' | transloco) : option }}
            </option>
          }
        </select>
      </div>
    </div>
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalCount = input.required<number>();
  /** 0 means all items on one page. */
  readonly pageSize = input.required<number>();
  /** Page sizes; 0 is shown as "all". */
  readonly options = input.required<readonly number[]>();
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
