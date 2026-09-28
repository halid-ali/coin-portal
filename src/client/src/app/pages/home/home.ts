import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <section class="mx-auto max-w-2xl py-8 text-center">
      <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">
        {{ 'home.headline' | transloco }}
      </h1>

      @if (auth.currentUser(); as user) {
        <p class="mt-4 text-lg text-slate-600">
          {{ 'home.welcome' | transloco: { name: user.firstName } }}
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a routerLink="/collections" class="btn-primary">{{
            'home.goToCollections' | transloco
          }}</a>
          <a routerLink="/explore" class="btn-secondary">{{ 'nav.explore' | transloco }}</a>
        </div>
      } @else {
        <p class="mt-4 text-lg text-slate-600">
          {{ 'home.intro' | transloco }}
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a routerLink="/register" class="btn-primary">{{ 'home.registerFree' | transloco }}</a>
          <a routerLink="/login" class="btn-secondary">{{ 'nav.login' | transloco }}</a>
        </div>
        <a routerLink="/explore" class="link mt-6 inline-block">{{
          'home.browseCollectors' | transloco
        }}</a>
      }
    </section>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
}
