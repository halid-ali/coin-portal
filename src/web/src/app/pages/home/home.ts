import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { ACCOUNT_DELETED_STATE } from '../../core/settings/settings.service';
import { HomeDashboard } from './home-dashboard';
import { HomeWelcome } from './home-welcome';

/** Home page: the signed-in user's dashboard, or the introduction for visitors. */
@Component({
  selector: 'app-home',
  imports: [TranslocoPipe, HomeDashboard, HomeWelcome],
  template: `
    @if (auth.currentUser()) {
      <app-home-dashboard />
    } @else {
      @if (accountDeleted) {
        <p role="status" class="alert-success mt-4">{{ 'home.accountDeleted' | transloco }}</p>
      }
      <app-home-welcome />
    }
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);

  /** Set by Settings > Account after deleting the account; a reload does not repeat it. */
  protected readonly accountDeleted =
    inject(Router).currentNavigation()?.extras.state?.['notice'] === ACCOUNT_DELETED_STATE.notice;
}
