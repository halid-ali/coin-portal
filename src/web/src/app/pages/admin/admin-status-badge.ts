import { Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AdminUserStatus } from '../../core/admin/admin.models';

/**
 * A user's status in the panel: active, e-mail address not verified (gray, like UnverifiedMark),
 * temporarily locked out, or locked by an admin.
 */
@Component({
  selector: 'app-admin-status-badge',
  imports: [TranslocoPipe],
  host: { class: 'inline-flex max-w-full' },
  template: `
    <span
      class="truncate rounded-full px-2 py-0.5 text-xs font-medium ring-1"
      [class]="tone()"
      [title]="'admin.status.' + status() | transloco"
    >
      {{ 'admin.status.' + status() | transloco }}
    </span>
  `,
})
export class AdminStatusBadge {
  readonly status = input.required<AdminUserStatus>();

  protected readonly tone = computed(() => {
    switch (this.status()) {
      case 'Locked':
        return 'bg-danger-50 text-danger-800 ring-danger-200';
      case 'LockedOut':
        return 'bg-info-50 text-info-800 ring-info-200';
      case 'Unverified':
        return 'bg-shade-100 text-shade-700 ring-shade-300';
      default:
        return 'bg-success-50 text-success-800 ring-success-200';
    }
  });
}
