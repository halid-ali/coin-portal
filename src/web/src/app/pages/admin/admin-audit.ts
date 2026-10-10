import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { catchError, of, switchMap, tap } from 'rxjs';

import { AUDIT_ACTIONS, AdminAuditEntry, AdminAuditQuery } from '../../core/admin/admin.models';
import { namedOptions } from '../../core/admin/admin-list';
import { AdminService } from '../../core/admin/admin.service';
import { PagedResponse } from '../../core/coins/coin.models';
import { firstQueryParam } from '../../core/http/query-params';
import { PluralPipe } from '../../core/i18n/plural';
import { Combobox } from '../../shared/combobox/combobox';
import { Pagination } from '../../shared/pagination/pagination';
import { AdminListBase } from './admin-list-base';
import { delayedLoading } from '../../shared/skeleton';

/** Admin > Audit log: what admins did, newest first, with an action filter. */
@Component({
  selector: 'app-admin-audit',
  imports: [NgTemplateOutlet, RouterLink, TranslocoPipe, PluralPipe, Pagination, Combobox],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="max-w-full min-w-0">
          <label for="admin-audit-action" class="sr-only">{{
            'admin.audit.action' | transloco
          }}</label>
          <app-combobox
            inputId="admin-audit-action"
            searchable="false"
            fitOptions
            class="max-w-full min-w-0"
            [options]="actionOptions()"
            [allLabel]="'admin.audit.allActions' | transloco"
            [value]="actionValue() ?? ''"
            [label]="'admin.audit.action' | transloco"
            (valueChange)="setAction($event)"
          />
        </div>
      </div>

      @if (loading() && !result() && !loadError()) {
        <p role="status" class="sr-only">{{ 'common.loading' | transloco }}</p>
      }

      @if (loadError()) {
        <p role="alert" class="alert-error">{{ 'admin.loadFailed' | transloco }}</p>
      } @else if (result() || showSkeleton()) {
        <!-- A load that takes a while: placeholder shapes in the rows' place (user choice 2026-10-10) -->
        @let items = showSkeleton() ? [] : (result()?.items ?? []);
        @if (result(); as r) {
          <p class="text-sm text-shade-500">{{ 'admin.audit.count' | plural: r.totalCount }}</p>
        } @else {
          <div class="flex h-5 items-center" aria-hidden="true">
            <div class="skeleton h-3 w-24 rounded-full"></div>
          </div>
        }

        @if (result()?.items?.length === 0 && !showSkeleton()) {
          <p class="card text-sm text-shade-600">{{ 'admin.audit.empty' | transloco }}</p>
        } @else {
          <!-- Above too (like the coin list): on phones only this one has the page size -->
          @if (result(); as r) {
            <app-pagination
              [page]="r.page"
              [totalPages]="r.totalPages"
              [totalCount]="r.totalCount"
              [pageSize]="pageSizeValue()"
              [options]="pageSizes"
              [disabled]="loading()"
              (pageChange)="goToPage($event)"
              (pageSizeChange)="setPageSize($event)"
            />
          }

          <!-- Narrow screens: one card per entry -->
          <ul class="space-y-3 xl:hidden" [attr.aria-busy]="loading()">
            @if (showSkeleton()) {
              @for (i of skeletonRows(); track i) {
                <li class="card p-4" aria-hidden="true">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1 space-y-2.5 pt-1">
                      <div class="skeleton h-3.5 w-2/5 rounded-full"></div>
                      <div class="skeleton h-3 w-3/5 rounded-full"></div>
                    </div>
                    <div class="skeleton h-5 w-16 shrink-0 rounded-full"></div>
                  </div>
                  <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                    @for (j of [0, 1, 2, 3]; track j) {
                      <div class="space-y-1.5">
                        <div class="skeleton h-2.5 w-12 rounded-full"></div>
                        <div class="skeleton h-3 w-20 rounded-full"></div>
                      </div>
                    }
                  </div>
                </li>
              }
            }
            @for (e of items; track e.id) {
              <li class="card p-4 text-sm">
                <ng-container *ngTemplateOutlet="what; context: { $implicit: e }" />
                <p class="mt-1 text-xs text-shade-500">
                  {{ dateTime(e.createdAtUtc) }} ·
                  {{
                    e.actorUserName
                      ? '@' + e.actorUserName
                      : ('admin.audit.deletedUser' | transloco)
                  }}
                </p>
              </li>
            }
          </ul>

          <!-- Wide screens (xl): time, admin, and the action with its target and note (takes
           the rest). Measured as in admin-users.html: time the longest English date and time;
           admin "@" + a 20-character user name (the limit). -->
          <div class="card hidden overflow-x-auto p-0 xl:block" [attr.aria-busy]="loading()">
            <table class="w-full table-fixed text-left text-sm">
              <caption class="sr-only">
                {{
                  'admin.nav.audit' | transloco
                }}
              </caption>
              <colgroup>
                <col class="w-[175px]" />
                <col class="w-[171px]" />
                <col />
              </colgroup>
              <thead class="border-b border-shade-200 bg-shade-50 text-shade-600">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium whitespace-nowrap">
                    {{ 'admin.audit.column.time' | transloco }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium whitespace-nowrap">
                    {{ 'admin.audit.column.actor' | transloco }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium whitespace-nowrap">
                    {{ 'admin.audit.column.action' | transloco }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-shade-100">
                @if (showSkeleton()) {
                  @for (i of skeletonRows(); track i) {
                    <tr aria-hidden="true">
                      <td class="px-3 py-3">
                        <div class="skeleton h-3.5 w-3/4 rounded-full"></div>
                      </td>
                      <td class="px-3 py-3">
                        <div class="skeleton h-3.5 w-3/5 rounded-full"></div>
                      </td>
                      <td class="px-3 py-2.5">
                        <div class="space-y-2 py-0.5">
                          <div class="skeleton h-3.5 w-2/5 rounded-full"></div>
                          <div class="skeleton h-3 w-3/5 rounded-full"></div>
                        </div>
                      </td>
                    </tr>
                  }
                }
                @for (e of items; track e.id) {
                  <tr class="align-top">
                    <td class="truncate px-3 py-2.5 tabular-nums">
                      {{ dateTime(e.createdAtUtc) }}
                    </td>
                    <td class="truncate px-3 py-2.5" [title]="e.actorUserName ?? ''">
                      {{
                        e.actorUserName
                          ? '@' + e.actorUserName
                          : ('admin.audit.deletedUser' | transloco)
                      }}
                    </td>
                    <td class="px-3 py-2.5">
                      <ng-container *ngTemplateOutlet="what; context: { $implicit: e }" />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (result(); as r) {
            <app-pagination
              placement="bottom"
              [page]="r.page"
              [totalPages]="r.totalPages"
              [totalCount]="r.totalCount"
              [pageSize]="pageSizeValue()"
              [options]="pageSizes"
              [disabled]="loading()"
              (pageChange)="goToPage($event)"
              (pageSizeChange)="setPageSize($event)"
            />
          }
        }
      }
    </div>

    <!-- The action, then its target (the user links to their admin page) and the note -->
    <ng-template #what let-e>
      <p class="font-medium text-shade-900">{{ 'admin.audit.actions.' + e.action | transloco }}</p>
      <p class="min-w-0 wrap-break-word text-shade-600">
        @if (e.targetUserName) {
          <a [routerLink]="['/admin/users', e.targetUserId]" class="link"
            >&#64;{{ e.targetUserName }}</a
          >
        } @else if (e.targetUserId) {
          <span>{{ 'admin.audit.deletedUser' | transloco }}</span>
        }
        @if (e.targetCollectionName) {
          <span> · {{ e.targetCollectionName }}</span>
        } @else if (e.targetCollectionId) {
          <span> · {{ 'admin.audit.deletedCollection' | transloco }}</span>
        }
        @if (e.action === 'VerificationEmailsRequested' && e.newValue !== null) {
          <span>{{ 'admin.audit.accounts' | plural: +e.newValue }}</span>
        }
        @if (e.setting) {
          <span
            >{{ 'admin.settings.names.' + e.setting | transloco }}: {{ e.oldValue }}
            <span aria-hidden="true">→</span
            ><span class="sr-only">{{ 'admin.audit.changedTo' | transloco }}</span>
            {{ e.newValue }}</span
          >
        }
      </p>
      @if (e.note) {
        <p class="mt-1 wrap-break-word text-shade-700 italic">{{ e.note }}</p>
      }
    </ng-template>
  `,
})
export class AdminAudit extends AdminListBase {
  private readonly admin = inject(AdminService);

  readonly action = input(undefined, { transform: firstQueryParam });

  // The action filter's choices (a list-only combobox, user choice 2026-10-10)
  private readonly actionNames = translateSignal(AUDIT_ACTIONS.map((a) => `audit.actions.${a}`));
  protected readonly actionOptions = computed(() =>
    namedOptions(AUDIT_ACTIONS, this.actionNames() as string[]),
  );
  protected readonly actionValue = computed(() => AUDIT_ACTIONS.find((a) => a === this.action()));
  private readonly query = computed<AdminAuditQuery>(() => ({
    action: this.actionValue(),
    page: this.pageNumber(),
    pageSize: this.pageSizeValue(),
  }));

  protected readonly result = signal<PagedResponse<AdminAuditEntry> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  /** Placeholder rows when a load takes a while: as many as shown now, so the page keeps its height. */
  protected readonly showSkeleton = delayedLoading(this.loading);
  protected readonly skeletonRows = computed(() => [
    ...Array(Math.min(this.result()?.items.length || 10, 50)).keys(),
  ]);

  constructor() {
    super();
    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap((query) =>
          this.admin.audit(query).pipe(
            catchError(() => {
              this.loadError.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (this.leftPastLastPage(result)) {
          return;
        }
        this.result.set(result);
        this.loading.set(false);
      });
  }

  protected setAction(value: string): void {
    this.setFilters({
      action: (AUDIT_ACTIONS as readonly string[]).includes(value) ? value : null,
    });
  }
}
