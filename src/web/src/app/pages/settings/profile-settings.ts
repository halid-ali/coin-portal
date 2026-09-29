import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';

/**
 * Settings > Profile: the signed-in user's account details, read only for now (which of them can
 * be changed is still to be decided). Shows the current user, so no extra request.
 */
@Component({
  selector: 'app-profile-settings',
  imports: [TranslocoPipe],
  template: `
    @if (auth.currentUser(); as user) {
      <div class="card space-y-5">
        <div>
          <h2 class="text-lg font-semibold text-shade-900">
            {{ 'settings.profile.title' | transloco }}
          </h2>
          <p class="mt-1 text-sm text-shade-600">
            {{ 'settings.profile.description' | transloco }}
          </p>
        </div>

        <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div class="min-w-0">
            <dt class="text-sm text-shade-500">{{ 'settings.profile.firstName' | transloco }}</dt>
            <dd class="mt-0.5 font-medium break-words text-shade-900">{{ user.firstName }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-sm text-shade-500">{{ 'settings.profile.lastName' | transloco }}</dt>
            <dd class="mt-0.5 font-medium break-words text-shade-900">{{ user.lastName }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-sm text-shade-500">{{ 'settings.profile.userName' | transloco }}</dt>
            <dd class="mt-0.5 font-medium break-words text-shade-900">{{ user.userName }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-sm text-shade-500">{{ 'settings.profile.email' | transloco }}</dt>
            <dd class="mt-0.5 font-medium break-words text-shade-900">{{ user.email }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-sm text-shade-500">{{ 'settings.profile.birthDate' | transloco }}</dt>
            <dd class="mt-0.5 font-medium text-shade-900">{{ birthDate() }}</dd>
          </div>
        </dl>
      </div>
    }
  `,
})
export class ProfileSettings {
  protected readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  /** Long date in the UI language; the ISO date is read as UTC so no time zone shifts the day. */
  protected readonly birthDate = computed(() => {
    const iso = this.auth.currentUser()?.birthDate;
    if (!iso) {
      return '';
    }
    const [year, month, day] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(this.language.current(), {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  });
}
