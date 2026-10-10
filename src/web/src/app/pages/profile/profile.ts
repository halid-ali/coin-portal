import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, of, switchMap, tap } from 'rxjs';

import { httpErrorKey } from '../../core/http/problem-details';
import { PluralPipe } from '../../core/i18n/plural';
import { APP_NAME } from '../../core/i18n/translated-title-strategy';
import { ExploreReturn } from '../../core/public/explore-return';
import { PublicProfile } from '../../core/public/public.models';
import { PublicService } from '../../core/public/public.service';
import { Breadcrumbs, Crumb } from '../../shared/breadcrumbs/breadcrumbs';
import { CollectionCard } from '../../shared/collection-card/collection-card';
import { CollectionCardSkeleton } from '../../shared/collection-card/collection-card-skeleton';
import { delayedLoading } from '../../shared/skeleton';

/** Public profile (/u/:userName): the user's public collections. Works signed out. */
@Component({
  selector: 'app-profile',
  imports: [
    RouterLink,
    TranslocoPipe,
    PluralPipe,
    Breadcrumbs,
    CollectionCard,
    CollectionCardSkeleton,
  ],
  template: `
    <section class="space-y-6">
      @if (notFound()) {
        <div class="card text-center">
          <h1 class="sr-only">{{ 'profile.notFoundTitle' | transloco }}</h1>
          <p class="text-shade-600">
            {{ 'profile.notFound' | transloco }}
          </p>
          <a routerLink="/explore" class="btn-secondary mt-4">{{
            'common.goToExplore' | transloco
          }}</a>
        </div>
      } @else if (loadError(); as key) {
        <div role="alert" class="alert-error">{{ key | transloco }}</div>
      } @else if (profile(); as p) {
        <div>
          <app-breadcrumbs class="mb-3" [items]="breadcrumbs()" />
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
        <!-- Placeholder shapes after a moment (user choice 2026-10-10); the way here is known -->
        <p role="status" class="sr-only">{{ 'common.loading' | transloco }}</p>
        @if (showSkeleton()) {
          <div>
            <app-breadcrumbs class="mb-3" [items]="breadcrumbs()" />
            <div class="flex items-center gap-4" aria-hidden="true">
              <div class="skeleton size-14 shrink-0 rounded-full"></div>
              <div class="min-w-0 space-y-3">
                <div class="skeleton h-6 w-40 max-w-full rounded-full"></div>
                <div class="skeleton h-3 w-48 max-w-full rounded-full"></div>
              </div>
              <div class="skeleton ml-auto h-10 w-32 shrink-0 rounded-lg"></div>
            </div>
          </div>
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            @for (i of [0, 1, 2]; track i) {
              <li><app-collection-card-skeleton /></li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class Profile {
  private readonly publicService = inject(PublicService);
  private readonly title = inject(Title);
  private readonly exploreReturn = inject(ExploreReturn);

  /** Route param, bound by withComponentInputBinding(). */
  readonly userName = input.required<string>();

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly notFound = signal(false);
  /** Translation key when the profile could not be loaded for another reason than 404. */
  protected readonly loadError = signal<string | null>(null);
  protected readonly showSkeleton = delayedLoading(
    computed(() => this.profile() === null && !this.notFound() && this.loadError() === null),
  );

  /** From the address while the profile loads (the way here shows it). */
  protected readonly initial = computed(() =>
    (this.profile()?.userName ?? this.userName()).charAt(0).toUpperCase(),
  );
  /** Explore > @user: profiles are reached from Explore (or a link from outside). */
  protected readonly breadcrumbs = computed<readonly Crumb[]>(() => [
    { key: 'nav.explore', link: this.exploreReturn.link(), icon: 'explore' },
    { text: '@' + (this.profile()?.userName ?? this.userName()), avatar: this.initial() },
  ]);
  protected readonly totalCoins = computed(() =>
    (this.profile()?.collections ?? []).reduce((sum, c) => sum + c.coinCount, 0),
  );

  constructor() {
    toObservable(this.userName)
      .pipe(
        tap(() => {
          this.profile.set(null);
          this.notFound.set(false);
          this.loadError.set(null);
        }),
        switchMap((userName) =>
          this.publicService.profile(userName).pipe(
            catchError((err: HttpErrorResponse) => {
              if (err.status === 404) {
                this.notFound.set(true);
              } else {
                // e.g. the rate limit of signed-out reads: not a missing profile
                this.loadError.set(httpErrorKey(err));
              }
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((profile) => {
        this.profile.set(profile);
        if (profile) {
          this.title.setTitle(`@${profile.userName} · ${APP_NAME}`);
        }
      });
  }
}
