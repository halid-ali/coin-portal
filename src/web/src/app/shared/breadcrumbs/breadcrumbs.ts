import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { Params, RouterLink, UrlTree } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** One step of the trail. The last one is the current page: no link. */
export interface Crumb {
  /** Translation key; names (a user, a collection) come as `text` instead. */
  readonly key?: string;
  readonly text?: string;
  readonly link?: string | readonly unknown[] | UrlTree;
  readonly queryParams?: Params;
  /** The header menu's icon of the section. */
  readonly icon?: 'explore' | 'collections';
  /** A user's initial: a small avatar, as in the header and on the profile. */
  readonly avatar?: string;
  /**
   * A name still loading (a collection's): a placeholder bar (`.skeleton`), and no link yet, so
   * there is no link without a name.
   */
  readonly loading?: boolean;
}

/**
 * Trail above a page's heading (user decision 2026-10-07): the pages above are chip links, the
 * current page plain text. On phones the current page is left out (the heading says it), so the
 * names above it keep their room.
 */
@Component({
  selector: 'app-breadcrumbs',
  imports: [NgTemplateOutlet, RouterLink, TranslocoPipe],
  host: { class: 'block' },
  template: `
    <nav [attr.aria-label]="'breadcrumbs.label' | transloco">
      <ol class="flex min-w-0 items-center gap-2 text-sm">
        @for (crumb of items(); track $index; let first = $first, last = $last) {
          @if (!last) {
            <li class="flex items-center gap-2" [class]="first ? 'shrink-0' : 'min-w-0'">
              @if (crumb.loading) {
                <span
                  class="flex items-center rounded-full bg-shade-0 px-3 py-1 shadow-sm ring-1 ring-shade-200"
                  aria-hidden="true"
                >
                  <span class="skeleton my-1 h-3 w-24 rounded-full"></span>
                </span>
              } @else {
                <a
                  [routerLink]="crumb.link"
                  [queryParams]="crumb.queryParams"
                  class="flex min-w-0 items-center gap-1.5 rounded-full bg-shade-0 px-3 py-1 font-medium text-shade-700 shadow-sm ring-1 ring-shade-200 hover:bg-shade-100 hover:text-shade-900 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
                >
                  <ng-container
                    *ngTemplateOutlet="label; context: { $implicit: crumb }"
                  ></ng-container>
                </a>
              }
              <svg
                viewBox="0 0 24 24"
                class="size-3.5 shrink-0 text-shade-400"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </li>
          } @else {
            <li class="hidden min-w-0 sm:flex">
              <span
                class="flex min-w-0 items-center gap-1.5 font-medium text-shade-900"
                aria-current="page"
              >
                <ng-container
                  *ngTemplateOutlet="label; context: { $implicit: crumb }"
                ></ng-container>
              </span>
            </li>
          }
        }
      </ol>
    </nav>

    <ng-template #label let-crumb>
      @if (crumb.loading) {
        <span class="skeleton h-3 w-28 rounded-full" aria-hidden="true"></span>
      } @else if (crumb.avatar) {
        <span
          aria-hidden="true"
          class="grid size-4.5 shrink-0 place-items-center rounded-full bg-slate-800 text-[10px] font-semibold text-white dark:bg-slate-700"
          >{{ crumb.avatar }}</span
        >
      } @else if (crumb.icon) {
        <svg
          viewBox="0 0 24 24"
          class="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          @if (crumb.icon === 'explore') {
            <circle cx="12" cy="12" r="9" />
            <path d="m15.5 8.5-2 5-5 2 2-5z" />
          } @else {
            <!-- stacked coins -->
            <ellipse cx="12" cy="6" rx="7" ry="3" />
            <path
              d="M5 6v4c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 10v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4M5 14v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4"
            />
          }
        </svg>
      }
      @if (!crumb.loading) {
        <span class="truncate">{{ crumb.key ? (crumb.key | transloco) : crumb.text }}</span>
      }
    </ng-template>
  `,
})
export class Breadcrumbs {
  readonly items = input.required<readonly Crumb[]>();
}
