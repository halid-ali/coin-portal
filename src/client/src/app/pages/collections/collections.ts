import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Collection } from '../../core/collections/collection.models';
import { CollectionService, coverUrl } from '../../core/collections/collection.service';
import { CollectionFormDialog } from './collection-form-dialog';

/** "Koleksiyonlarım": the user's collections as cards, plus creating a new one. */
@Component({
  selector: 'app-collections',
  imports: [RouterLink, CollectionFormDialog],
  template: `
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Koleksiyonlarım</h1>
          @if (collections(); as list) {
            <p class="text-sm text-slate-600">
              {{ list.length }} koleksiyon · {{ totalCoins() }} coin
            </p>
          }
        </div>
        <button type="button" class="btn-primary" (click)="creating.set(true)">
          + Yeni koleksiyon
        </button>
      </div>

      @if (loadError()) {
        <div role="alert" class="alert-error">
          Koleksiyonlar yüklenemedi. Sayfayı yenileyip tekrar dene.
        </div>
      } @else if (collections(); as list) {
        @if (list.length === 0) {
          <div class="card text-center">
            <p class="text-slate-600">Henüz koleksiyonun yok.</p>
            <button type="button" class="btn-primary mt-4" (click)="creating.set(true)">
              İlk koleksiyonunu oluştur
            </button>
          </div>
        } @else {
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (collection of list; track collection.id) {
              <li>
                <a
                  [routerLink]="['/collections', collection.id]"
                  class="card group block h-full overflow-hidden p-0 transition-colors hover:border-amber-300
                          focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                >
                  <div class="aspect-[16/9] overflow-hidden bg-slate-100">
                    @if (cover(collection); as src) {
                      <img
                        [src]="src"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    } @else {
                      <div class="flex size-full items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          class="size-16 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.25"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <circle cx="12" cy="12" r="5.5" />
                        </svg>
                      </div>
                    }
                  </div>
                  <div class="space-y-1 p-4">
                    <h2 class="truncate font-semibold text-slate-900">{{ collection.name }}</h2>
                    @if (collection.description) {
                      <p class="line-clamp-2 text-sm text-slate-600">
                        {{ collection.description }}
                      </p>
                    }
                    <p class="text-sm text-slate-500">{{ collection.coinCount }} coin</p>
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      } @else {
        <p class="text-center text-slate-500">Yükleniyor…</p>
      }
    </section>

    @if (creating()) {
      <app-collection-form-dialog (closed)="onCreated($event)" />
    }
  `,
})
export class Collections {
  private readonly collectionService = inject(CollectionService);
  private readonly router = inject(Router);

  protected readonly collections = signal<Collection[] | null>(null);
  protected readonly loadError = signal(false);
  protected readonly creating = signal(false);

  constructor() {
    this.collectionService.list().subscribe({
      next: (list) => this.collections.set(list),
      error: () => this.loadError.set(true),
    });
  }

  protected totalCoins(): number {
    return (this.collections() ?? []).reduce((sum, c) => sum + c.coinCount, 0);
  }

  // The card is wide, so the 600 px size
  protected cover(collection: Collection): string | null {
    return coverUrl(collection, 'preview');
  }

  /** A new collection is empty: go straight to it, so coins can be added. */
  protected onCreated(collection: Collection | null): void {
    this.creating.set(false);
    if (collection) {
      this.router.navigate(['/collections', collection.id]);
    }
  }
}
