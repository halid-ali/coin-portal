import { Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

let nextId = 0;

/**
 * Pagination bar in three parts: projected content on the left (e.g. view switch), first /
 * previous / current / next / last buttons in the middle, range and page size on the right.
 * Phones keep it to one row, by `placement`: above the list the projected content, previous /
 * current / next and the page size; below it only the page buttons, centered. The range is
 * hidden on phones (the page header shows the total). Below 360 px the top one falls back to two
 * rows (the "all" option makes the page size select too wide); the "per page" label shows from md.
 */
@Component({
  selector: 'app-pagination',
  imports: [TranslocoPipe],
  // Custom elements are inline by default; block lets the parent's spacing apply
  host: { class: 'block' },
  template: `
    <div
      class="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]"
      [class]="bottom() ? 'grid-cols-1' : 'grid-cols-[auto_1fr_auto] max-[359px]:grid-cols-2'"
    >
      <div class="justify-self-start" [class.max-sm:hidden]="bottom()">
        <ng-content />
      </div>

      <nav
        class="flex items-center justify-center gap-1 max-[359px]:order-last max-[359px]:col-span-2"
        [attr.aria-label]="'pagination.nav' | transloco"
      >
        <button
          type="button"
          class="btn-icon"
          [class.max-sm:hidden]="!bottom()"
          [attr.aria-disabled]="disabled() || isFirst() ? 'true' : null"
          (click)="go(1)"
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
          [attr.aria-disabled]="disabled() || isFirst() ? 'true' : null"
          (click)="go(page() - 1)"
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
          [attr.aria-disabled]="disabled() || isLast() ? 'true' : null"
          (click)="go(page() + 1)"
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
          [class.max-sm:hidden]="!bottom()"
          [attr.aria-disabled]="disabled() || isLast() ? 'true' : null"
          (click)="go(totalPages())"
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

      <div
        class="flex items-center gap-3 justify-self-end text-sm text-shade-600"
        [class.max-sm:hidden]="bottom()"
      >
        <span class="whitespace-nowrap max-sm:hidden">{{ range() }} / {{ totalCount() }}</span>
        <label [for]="selectId" class="font-medium text-shade-700 max-md:sr-only">{{
          'pagination.perPage' | transloco
        }}</label>
        <select
          [id]="selectId"
          #sizeSelect
          class="form-input w-auto py-1.5"
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
  /**
   * While a page loads. The buttons are aria-disabled, not disabled: a disabled button loses the
   * keyboard focus (back to the page start) when it was the one just pressed.
   */
  readonly disabled = input(false);
  /** Above or below the list; decides what phones keep (see above). */
  readonly placement = input<'top' | 'bottom'>('top');

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  // Unique per instance, the component is rendered above and below the list
  protected readonly selectId = `page-size-${++nextId}`;

  protected readonly bottom = computed(() => this.placement() === 'bottom');
  protected readonly isFirst = computed(() => this.page() <= 1);
  protected readonly isLast = computed(() => this.page() >= this.totalPages());

  /** Ignores presses while loading or on a button that leads nowhere (aria-disabled). */
  protected go(target: number): void {
    if (this.disabled() || target < 1 || target > this.totalPages() || target === this.page()) {
      return;
    }
    this.pageChange.emit(target);
  }

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
