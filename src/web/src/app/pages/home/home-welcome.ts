import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LineCoin } from './line-coin';

/** A filled slot of the album illustration: a coin drawn in lines on a tinted tile. */
interface AlbumCoin {
  value: string;
  twoMetals: boolean;
  /** stat-icon hue class of the tile */
  hue: string;
  /** Country code and year under the coin (the same in every language) */
  caption: string;
}

const ALBUM: readonly (AlbumCoin | null)[] = [
  { value: '2€', twoMetals: true, hue: 'stat-icon-amber', caption: 'DE · 2006' },
  { value: '2€', twoMetals: true, hue: 'stat-icon-amber', caption: 'IT · 2012' },
  { value: '1€', twoMetals: true, hue: 'stat-icon-sky', caption: 'FR · 2001' },
  { value: '50c', twoMetals: false, hue: 'stat-icon-emerald', caption: 'ES · 2010' },
  null, // the missing coin
  { value: '5c', twoMetals: false, hue: 'stat-icon-emerald', caption: 'NL · 2019' },
];

/**
 * Home page for visitors (signed out): what the site does, the album illustration, the three main
 * features, three steps to start and the free / no ads promise.
 */
@Component({
  selector: 'app-home-welcome',
  imports: [RouterLink, TranslocoPipe, LineCoin],
  host: { class: 'block' },
  template: `
    <section
      class="grid items-center gap-10 pt-4 pb-6 sm:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12"
    >
      <div>
        <p class="text-sm font-semibold tracking-wide text-brand-700 uppercase">
          {{ 'home.eyebrow' | transloco }}
        </p>
        <h1
          class="mt-3 text-4xl leading-tight font-bold tracking-tight text-balance text-shade-900 sm:text-5xl"
        >
          {{ 'home.title' | transloco }}
        </h1>
        <p class="mt-5 text-lg leading-relaxed text-shade-600">{{ 'home.intro' | transloco }}</p>

        <!-- Side by side; if they do not fit (narrow phone, long language) they wrap, their text does not -->
        <div class="mt-7 flex flex-wrap gap-3">
          <a
            routerLink="/register"
            class="btn-primary flex-auto whitespace-nowrap sm:flex-none sm:px-5 sm:py-2.5"
            >{{ 'home.registerFree' | transloco }}</a
          >
          <a
            routerLink="/login"
            class="btn-secondary flex-auto whitespace-nowrap sm:flex-none sm:px-5 sm:py-2.5"
            >{{ 'nav.login' | transloco }}</a
          >
        </div>
        <ul class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-shade-700">
          @for (key of trust; track key) {
            <li>
              <span aria-hidden="true" class="mr-1.5 text-success-600">✓</span>{{ key | transloco }}
            </li>
          }
        </ul>
        <a routerLink="/explore" class="link mt-6 inline-block"
          >{{ 'home.browseCollectors' | transloco }} <span aria-hidden="true">→</span></a
        >
      </div>

      <!-- Album illustration (decorative): coins drawn in lines, one slot still missing -->
      <div aria-hidden="true" class="relative mx-1 mb-8 h-72 sm:h-80 lg:mb-0 lg:h-90">
        <div
          class="absolute inset-x-0 top-1.5 bottom-4 -rotate-3 rounded-3xl border border-shade-200 bg-shade-0 shadow-xl shadow-shade-900/10 sm:inset-x-6"
        ></div>
        <div
          class="absolute inset-x-4 top-6 bottom-9 grid -rotate-3 grid-cols-3 gap-2.5 sm:inset-x-12 sm:top-9 sm:bottom-12 sm:gap-3.5"
        >
          @for (slot of album; track $index) {
            @if (slot) {
              <div
                class="stat-icon flex flex-col items-center justify-center gap-1 rounded-2xl"
                [class]="slot.hue"
              >
                <app-line-coin
                  class="size-11 sm:size-14"
                  [value]="slot.value"
                  [twoMetals]="slot.twoMetals"
                />
                <span class="text-[11px] font-semibold text-shade-700">{{ slot.caption }}</span>
              </div>
            } @else {
              <div
                class="flex flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-shade-300 bg-shade-50 text-shade-500"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="size-11 sm:size-14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                >
                  <circle cx="12" cy="12" r="10" stroke-dasharray="2.2 2.4" />
                  <path d="M12 8.5v7M8.5 12h7" />
                </svg>
                <span class="text-[11px] font-semibold">{{
                  'home.album.missing' | transloco
                }}</span>
              </div>
            }
          }
        </div>
        <div
          class="absolute -right-0.5 -bottom-8 rounded-xl border border-shade-200 bg-shade-0 px-3.5 py-2.5 text-sm shadow-lg shadow-shade-900/10 sm:-right-2 sm:-bottom-5"
        >
          <p class="font-semibold text-shade-900">{{ 'home.album.coin' | transloco }}</p>
          <p class="text-xs text-shade-600">
            {{ 'home.album.owned' | transloco }} <span class="text-success-600">✓</span>
          </p>
        </div>
      </div>
    </section>

    <section
      class="mt-10 grid gap-4 md:grid-cols-3 md:gap-5"
      [attr.aria-label]="'home.featuresLabel' | transloco"
    >
      @for (feature of features; track feature.key) {
        <div class="card grid grid-cols-[auto_1fr] gap-x-3.5 p-5 md:block md:p-6">
          <span
            class="stat-icon row-span-2 size-11 rounded-xl md:mb-4 md:size-12 md:rounded-2xl"
            [class]="feature.hue"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              @switch (feature.key) {
                @case ('photo') {
                  <!-- camera -->
                  <path
                    d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"
                  />
                  <circle cx="12" cy="13" r="3.5" />
                }
                @case ('check') {
                  <!-- magnifier with a check mark -->
                  <circle cx="11" cy="11" r="7.5" />
                  <path d="m20.5 20.5-4.2-4.2M8 11l2.2 2.2L14.5 9" />
                }
                @case ('share') {
                  <!-- share -->
                  <circle cx="18" cy="5" r="2.75" />
                  <circle cx="6" cy="12" r="2.75" />
                  <circle cx="18" cy="19" r="2.75" />
                  <path d="m8.4 13.4 7.2 4.2M15.6 6.4l-7.2 4.2" />
                }
              }
            </svg>
          </span>
          <h2 class="mt-0.5 font-semibold text-shade-900 md:text-lg">
            {{ 'home.features.' + feature.key + '.title' | transloco }}
          </h2>
          <p class="mt-1 text-sm leading-relaxed text-shade-600">
            {{ 'home.features.' + feature.key + '.text' | transloco }}
          </p>
        </div>
      }
    </section>

    <section class="mt-10 md:mt-14">
      <h2 class="sr-only">{{ 'home.steps.title' | transloco }}</h2>
      <ol class="grid gap-5 md:grid-cols-3">
        @for (step of steps; track step; let n = $index) {
          <li class="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              class="grid size-8 shrink-0 place-items-center rounded-full font-bold"
              style="background: var(--logo-coin); color: var(--logo-sign)"
              >{{ n + 1 }}</span
            >
            <div>
              <h3 class="font-semibold text-shade-900">
                {{ 'home.steps.' + step + '.title' | transloco }}
              </h3>
              <p class="mt-0.5 text-sm leading-relaxed text-shade-600">
                {{ 'home.steps.' + step + '.text' | transloco }}
              </p>
            </div>
          </li>
        }
      </ol>
    </section>

    <!-- Inverted in both themes (shade-900 / shade-0); the check marks use the logo's sign color -->
    <section
      class="mt-10 flex flex-col gap-6 rounded-xl bg-shade-900 px-5 py-6 text-shade-0 sm:px-9 sm:py-8 md:mt-14 md:flex-row md:items-center"
    >
      <div class="flex-1">
        <h2 class="text-2xl font-bold tracking-tight">{{ 'home.promise.title' | transloco }}</h2>
        <p class="mt-1.5 text-shade-300">{{ 'home.promise.text' | transloco }}</p>
        <ul class="mt-3 flex flex-col gap-1.5 text-sm text-shade-200 md:flex-row md:gap-6">
          @for (key of promises; track key) {
            <li>
              <span aria-hidden="true" class="mr-1.5 font-bold" style="color: var(--logo-sign)"
                >✓</span
              >{{ key | transloco }}
            </li>
          }
        </ul>
      </div>
      <a routerLink="/register" class="btn-primary whitespace-nowrap">{{
        'home.registerFree' | transloco
      }}</a>
    </section>
  `,
})
export class HomeWelcome {
  protected readonly album = ALBUM;
  protected readonly trust = ['home.trust.free', 'home.trust.noAds', 'home.trust.yourData'];
  protected readonly features = [
    { key: 'photo', hue: 'stat-icon-amber' },
    { key: 'check', hue: 'stat-icon-emerald' },
    { key: 'share', hue: 'stat-icon-sky' },
  ];
  protected readonly steps = ['account', 'add', 'share'];
  protected readonly promises = ['home.promise.free', 'home.promise.noAds', 'home.promise.export'];
}
