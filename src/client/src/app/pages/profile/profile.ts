import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of, switchMap, tap } from 'rxjs';

import { PluralPipe } from '../../core/i18n/plural';
import { PublicProfile } from '../../core/public/public.models';
import { PublicService } from '../../core/public/public.service';
import { CollectionCard } from '../../shared/collection-card/collection-card';

/** Public profile (/u/:userName): the user's public collections. Works signed out. */
@Component({
  selector: 'app-profile',
  imports: [RouterLink, TranslocoPipe, PluralPipe, CollectionCard],
  template: `
    <section class="space-y-6">
      @if (notFound()) {
        <div class="card text-center">
          <p class="text-shade-600">
            {{ 'profile.notFound' | transloco }}
          </p>
          <a routerLink="/explore" class="btn-secondary mt-4">{{
            'common.goToExplore' | transloco
          }}</a>
        </div>
      } @else if (profile(); as p) {
        <div class="flex items-center gap-4">
          <span
            aria-hidden="true"
            class="grid size-14 shrink-0 place-items-center rounded-full bg-slate-800 text-xl font-semibold text-white dark:bg-slate-700"
          >
            {{ initial() }}
          </span>
          <div class="min-w-0">
            <h1 class="truncate text-2xl font-semibold text-shade-900">&#64;{{ p.userName }}</h1>
            <p class="text-sm text-shade-600">
              {{ 'profile.publicCollectionCount' | plural: p.collections.length }} ·
              {{ 'common.coinCount' | plural: totalCoins() }}
            </p>
          </div>
          <a
            [routerLink]="['/explore']"
            [queryParams]="{ owner: p.userName }"
            class="btn-secondary ml-auto"
          >
            {{ 'profile.allCoins' | transloco }}
          </a>
        </div>

        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (collection of p.collections; track collection.id) {
            <li>
              <app-collection-card
                [collection]="collection"
                [link]="['/u', p.userName, collection.id]"
              />
            </li>
          }
        </ul>
      } @else {
        <p class="text-center text-shade-500">{{ 'common.loading' | transloco }}</p>
      }
    </section>
  `,
})
export class Profile {
  private readonly publicService = inject(PublicService);
  private readonly title = inject(Title);

  /** Route param, bound by withComponentInputBinding(). */
  readonly userName = input.required<string>();

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly notFound = signal(false);

  protected readonly initial = computed(
    () => this.profile()?.userName.charAt(0).toUpperCase() ?? '',
  );
  protected readonly totalCoins = computed(() =>
    (this.profile()?.collections ?? []).reduce((sum, c) => sum + c.coinCount, 0),
  );

  constructor() {
    toObservable(this.userName)
      .pipe(
        tap(() => {
          this.profile.set(null);
          this.notFound.set(false);
        }),
        switchMap((userName) =>
          this.publicService.profile(userName).pipe(
            catchError(() => {
              this.notFound.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((profile) => {
        this.profile.set(profile);
        if (profile) {
          this.title.setTitle(`@${profile.userName} · Coin Portal`);
        }
      });
  }
}
