import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of, switchMap, tap } from 'rxjs';

import { AUDIT_ACTIONS, AdminAuditEntry, AdminAuditQuery } from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { PagedResponse } from '../../core/coins/coin.models';
import { PluralPipe } from '../../core/i18n/plural';
import { Pagination } from '../../shared/pagination/pagination';
import { AdminListBase } from './admin-list-base';

/** Admin > Audit log: what admins did, newest first, with an action filter. */
@Component({
  selector: 'app-admin-audit',
  imports: [NgTemplateOutlet, RouterLink, TranslocoPipe, PluralPipe, Pagination],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="max-w-full min-w-0">
          <label for="admin-audit-action" class="sr-only">{{
            'admin.audit.action' | transloco
          }}</label>
          <select
            id="admin-audit-action"
            class="form-input w-auto max-w-full min-w-0"
            (change)="setAction(actionSelect.value)"
            #actionSelect
          >
            <option value="" [selected]="!actionValue()">
              {{ 'admin.audit.allActions' | transloco }}
            </option>
            @for (a of actions; track a) {
              <option [value]="a" [selected]="a === actionValue()">
                {{ 'admin.audit.actions.' + a | transloco }}
              </option>
            }
          </select>
        </div>
      </div>

      @if (loadError()) {
        <p class="alert-error">{{ 'admin.loadFailed' | transloco }}</p>
      } @else if (result(); as r) {
        <p class="text-sm text-shade-500">{{ 'admin.audit.count' | plural: r.totalCount }}</p>

        @if (r.items.length === 0) {
          <p class="card text-sm text-shade-600">{{ 'admin.audit.empty' | transloco }}</p>
        } @else {
          <!-- Narrow screens: one card per entry -->
          <ul class="space-y-3 xl:hidden" [class.opacity-60]="loading()">
            @for (e of r.items; track e.id) {
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
          <div class="card hidden overflow-x-auto p-0 xl:block" [class.opacity-60]="loading()">
            <table class="w-full table-fixed text-left text-sm">
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
                @for (e of r.items; track e.id) {
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
      </p>
      @if (e.note) {
        <p class="mt-1 wrap-break-word text-shade-700 italic">{{ e.note }}</p>
      }
    </ng-template>
  `,
})
export class AdminAudit extends AdminListBase {
  private readonly admin = inject(AdminService);

  readonly action = input<string>();

  protected readonly actions = AUDIT_ACTIONS;
  protected readonly actionValue = computed(() => AUDIT_ACTIONS.find((a) => a === this.action()));
  private readonly query = computed<AdminAuditQuery>(() => ({
    action: this.actionValue(),
    page: this.pageNumber(),
    pageSize: this.pageSizeValue(),
  }));

  protected readonly result = signal<PagedResponse<AdminAuditEntry> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

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
