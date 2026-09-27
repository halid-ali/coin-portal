import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Collection } from '../../core/collections/collection.models';
import { CollectionService } from '../../core/collections/collection.service';
import { CollectionCard } from '../../shared/collection-card/collection-card';
import { CollectionFormDialog } from './collection-form-dialog';

/** "Koleksiyonlarım": the user's collections as cards, plus creating a new one. */
@Component({
  selector: 'app-collections',
  imports: [CollectionCard, CollectionFormDialog],
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
                <app-collection-card
                  [collection]="collection"
                  [link]="['/collections', collection.id]"
                  [showVisibility]="true"
                />
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

  /** A new collection is empty: go straight to it, so coins can be added. */
  protected onCreated(collection: Collection | null): void {
    this.creating.set(false);
    if (collection) {
      this.router.navigate(['/collections', collection.id]);
    }
  }
}
