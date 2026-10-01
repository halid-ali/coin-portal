import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { EMPTY, Observable, catchError, firstValueFrom, forkJoin, switchMap } from 'rxjs';

import { formatBytes, formatDateTime, formatRelative } from '../../core/admin/admin-format';
import {
  ADMIN_NOTE_MAX_LENGTH,
  AdminAuditEntry,
  AdminUserDetail,
} from '../../core/admin/admin.models';
import { AdminService } from '../../core/admin/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { AdminStatusBadge } from './admin-status-badge';

/**
 * Admin > Users > one user (/admin/users/:id): account data and counts (no content), the lock,
 * and the audit log entries about the user. "Back" returns to the list as it was (filters, sort,
 * page), passed in the navigation state.
 */
@Component({
  selector: 'app-admin-user-detail',
  imports: [RouterLink, TranslocoPipe, AdminStatusBadge],
  template: `
    <div class="space-y-4">
      <a
        routerLink=".."
        [queryParams]="backQuery"
        class="link inline-flex items-center gap-1 text-sm"
      >
        <span aria-hidden="true">←</span> {{ 'admin.user.back' | transloco }}
      </a>

      @if (notFound()) {
        <p class="card text-sm text-shade-600">{{ 'admin.user.notFound' | transloco }}</p>
      } @else if (loadError()) {
        <p class="alert-error">{{ 'admin.loadFailed' | transloco }}</p>
      } @else if (user(); as u) {
        <div class="card space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-semibold break-all text-shade-900">{{ u.userName }}</h2>
                @if (u.isAdmin) {
                  <span
                    class="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800"
                    >{{ 'admin.users.adminBadge' | transloco }}</span
                  >
                }
                <app-admin-status-badge [status]="u.status" />
              </div>
              @if (u.publicCollectionCount > 0) {
                <a [routerLink]="['/u', u.userName]" class="link mt-1 inline-block text-sm">
                  {{ 'admin.user.publicProfile' | transloco }}
                </a>
              }
            </div>
            @if (u.isAdmin) {
              <p class="max-w-xs text-sm text-shade-500">
                {{ 'admin.user.adminNote' | transloco }}
              </p>
            } @else {
              <div class="flex flex-wrap gap-2">
                @if (u.status === 'Active') {
                  <button type="button" class="btn-danger" [disabled]="busy()" (click)="lock(u)">
                    {{ 'admin.user.lock' | transloco }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn-secondary"
                    [disabled]="busy()"
                    (click)="unlock(u)"
                  >
                    {{ 'admin.user.unlock' | transloco }}
                  </button>
                }
                <button
                  type="button"
                  class="btn-secondary text-danger-700"
                  [disabled]="busy()"
                  (click)="remove(u)"
                >
                  {{ 'admin.user.delete' | transloco }}
                </button>
              </div>
            }
          </div>
          @if (actionError()) {
            <p class="alert-error">{{ 'admin.actionFailed' | transloco }}</p>
          }

          <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div class="min-w-0">
              <dt class="text-shade-500">{{ 'admin.user.name' | transloco }}</dt>
              <dd class="font-medium wrap-break-word text-shade-900">
                {{ u.firstName }} {{ u.lastName }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-shade-500">{{ 'admin.user.email' | transloco }}</dt>
              <dd class="font-medium break-all text-shade-900">{{ u.email }}</dd>
            </div>
            <div>
              <dt class="text-shade-500">{{ 'admin.user.createdAt' | transloco }}</dt>
              <dd class="font-medium text-shade-900">{{ dateTime(u.createdAtUtc) }}</dd>
            </div>
            <div>
              <dt class="text-shade-500">{{ 'admin.user.lastSignIn' | transloco }}</dt>
              <dd class="font-medium text-shade-900">
                {{ u.lastSignInAtUtc ? dateTime(u.lastSignInAtUtc) : ('admin.never' | transloco) }}
              </dd>
            </div>
            <div>
              <dt class="text-shade-500">{{ 'admin.user.lastSeen' | transloco }}</dt>
              <dd
                class="font-medium text-shade-900"
                [title]="u.lastSeenAtUtc ? dateTime(u.lastSeenAtUtc) : ''"
              >
                {{ u.lastSeenAtUtc ? relative(u.lastSeenAtUtc) : ('admin.never' | transloco) }}
              </dd>
            </div>
            @if (u.lockedAtUtc) {
              <div>
                <dt class="text-shade-500">{{ 'admin.user.lockedAt' | transloco }}</dt>
                <dd class="font-medium text-danger-700">{{ dateTime(u.lockedAtUtc) }}</dd>
              </div>
            }
            @if (u.lockedOutUntilUtc) {
              <div>
                <dt class="text-shade-500">{{ 'admin.user.lockedOutUntil' | transloco }}</dt>
                <dd class="font-medium text-shade-900">{{ dateTime(u.lockedOutUntilUtc) }}</dd>
              </div>
            }
          </dl>
        </div>

        <div class="card">
          <h3 class="mb-3 font-semibold text-shade-900">{{ 'admin.user.content' | transloco }}</h3>
          <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt class="text-shade-500">{{ 'admin.user.collections' | transloco }}</dt>
              <dd class="font-medium text-shade-900 tabular-nums">
                {{ count(u.collectionCount) }}
              </dd>
              <dd class="text-xs text-shade-500">
                {{
                  'admin.user.collectionsDetail'
                    | transloco
                      : { public: u.publicCollectionCount, unlisted: u.unlistedCollectionCount }
                }}
              </dd>
            </div>
            <div>
              <dt class="text-shade-500">{{ 'admin.user.coins' | transloco }}</dt>
              <dd class="font-medium text-shade-900 tabular-nums">{{ count(u.coinCount) }}</dd>
            </div>
            <div>
              <dt class="text-shade-500">{{ 'admin.user.photos' | transloco }}</dt>
              <dd class="font-medium text-shade-900 tabular-nums">{{ count(u.photoCount) }}</dd>
            </div>
            <div>
              <dt class="text-shade-500">{{ 'admin.user.storage' | transloco }}</dt>
              <dd class="font-medium text-shade-900 tabular-nums">
                {{
                  'admin.user.storageOfQuota'
                    | transloco: { used: bytes(u.storageBytes), quota: bytes(u.quotaBytes) }
                }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="card">
          <h3 class="mb-3 font-semibold text-shade-900">{{ 'admin.user.history' | transloco }}</h3>
          @if (history().length === 0) {
            <p class="text-sm text-shade-600">{{ 'admin.user.noHistory' | transloco }}</p>
          } @else {
            <ul class="divide-y divide-shade-100 text-sm">
              @for (e of history(); track e.id) {
                <li class="py-2 first:pt-0 last:pb-0">
                  <p class="font-medium text-shade-900">
                    {{ 'admin.audit.actions.' + e.action | transloco }}
                    @if (e.targetCollectionName) {
                      <span class="font-normal text-shade-600">· {{ e.targetCollectionName }}</span>
                    }
                  </p>
                  <p class="text-xs text-shade-500">
                    {{ dateTime(e.createdAtUtc) }} ·
                    {{
                      e.actorUserName
                        ? '@' + e.actorUserName
                        : ('admin.audit.deletedUser' | transloco)
                    }}
                  </p>
                  @if (e.note) {
                    <p class="mt-1 wrap-break-word text-shade-700 italic">{{ e.note }}</p>
                  }
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
})
export class AdminUserDetailPage {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  /** Route parameter. */
  readonly id = input.required<string>();

  protected readonly user = signal<AdminUserDetail | null>(null);
  protected readonly history = signal<AdminAuditEntry[]>([]);
  protected readonly notFound = signal(false);
  protected readonly loadError = signal(false);
  protected readonly actionError = signal(false);
  protected readonly busy = signal(false);
  private readonly reloads = signal(0);

  /** Query params of the list this page was opened from (see AdminUsers). */
  protected readonly backQuery: Record<string, string> =
    (history.state as { listQuery?: Record<string, string> } | null)?.listQuery ?? {};

  constructor() {
    toObservable(computed(() => [this.id(), this.reloads()] as const))
      .pipe(
        switchMap(([id]) =>
          forkJoin({
            user: this.admin.user(id),
            history: this.admin.audit({ userId: id, pageSize: 50 }),
          }).pipe(
            catchError((err: { status?: number }) => {
              (err.status === 404 ? this.notFound : this.loadError).set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ user, history }) => {
        this.user.set(user);
        this.history.set(history.items);
      });
  }

  protected async lock(user: AdminUserDetail): Promise<void> {
    const note = await this.confirm.confirmWithNote({
      title: translate('admin.user.lockTitle'),
      message: translate('admin.user.lockMessage', { userName: user.userName }),
      confirmText: translate('admin.user.lock'),
      danger: true,
      note: this.noteField(),
    });
    if (note !== null) {
      await this.run(() => this.admin.lockUser(user.id, note));
    }
  }

  protected async unlock(user: AdminUserDetail): Promise<void> {
    const note = await this.confirm.confirmWithNote({
      title: translate('admin.user.unlockTitle'),
      message: translate('admin.user.unlockMessage', { userName: user.userName }),
      confirmText: translate('admin.user.unlock'),
      note: this.noteField(),
    });
    if (note !== null) {
      await this.run(() => this.admin.unlockUser(user.id, note));
    }
  }

  /** For good: the user's name must be typed, like deleting a collection. */
  protected async remove(user: AdminUserDetail): Promise<void> {
    const note = await this.confirm.confirmWithNote({
      title: translate('admin.user.deleteTitle'),
      message: translate('admin.user.deleteMessage', { userName: user.userName }),
      confirmText: translate('admin.user.delete'),
      danger: true,
      typeToConfirm: { label: translate('admin.user.deleteTypeName'), value: user.userName },
      note: this.noteField(),
    });
    if (note === null) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(false);
    try {
      await firstValueFrom(this.admin.deleteUser(user.id, note), { defaultValue: undefined });
      await this.router.navigate(['/admin/users'], { queryParams: this.backQuery });
    } catch {
      this.actionError.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  private noteField() {
    return {
      label: translate('admin.note.label'),
      hint: translate('admin.note.hint'),
      maxLength: ADMIN_NOTE_MAX_LENGTH,
    };
  }

  private async run(action: () => Observable<void>): Promise<void> {
    this.busy.set(true);
    this.actionError.set(false);
    try {
      await firstValueFrom(action(), { defaultValue: undefined });
      this.reloads.update((n) => n + 1);
    } catch {
      this.actionError.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  protected dateTime(iso: string): string {
    return formatDateTime(iso, this.language.current());
  }

  protected relative(iso: string): string {
    return formatRelative(iso, this.language.current());
  }

  protected bytes(value: number): string {
    return formatBytes(value, this.language.current());
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.language.current()).format(value);
  }
}
