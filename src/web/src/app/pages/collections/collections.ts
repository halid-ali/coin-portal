import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { Collection } from '../../core/collections/collection.models';
import { CollectionService } from '../../core/collections/collection.service';
import { EMAIL_LIMIT_IDS } from '../../layout/email-banner/email-banner';
import { PluralPipe } from '../../core/i18n/plural';
import { CollectionCard } from '../../shared/collection-card/collection-card';
import { CollectionFormDialog } from './collection-form-dialog';

/**
 * My collections: the user's collections as cards, plus creating a new one (once the e-mail
 * address is verified: gray before, the API answers 403 email_not_confirmed).
 */
@Component({
  selector: 'app-collections',
  imports: [TranslocoPipe, PluralPipe, CollectionCard, CollectionFormDialog],
  template: `
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-shade-900">
            {{ 'collections.title' | transloco }}
          </h1>
          @if (collections(); as list) {
            <p class="text-sm text-shade-600">
              {{ 'collections.collectionCount' | plural: list.length }} ·
              {{ 'common.coinCount' | plural: totalCoins() }}
            </p>
          }
        </div>
        <!-- Gray until the address is verified (the reason is in the e-mail notice above) -->
        <button
          type="button"
          [class]="emailBlocked() ? 'btn-unavailable' : 'btn-primary'"
          [attr.aria-disabled]="emailBlocked() || null"
          [attr.aria-describedby]="emailBlocked() ? limitIds.collections : null"
          (click)="create()"
        >
          <span aria-hidden="true" class="mr-1">+</span>{{ 'collections.new' | transloco }}
        </button>
      </div>

      @if (loadError()) {
        <div role="alert" class="alert-error">
          {{ 'collections.loadError' | transloco }}
        </div>
      } @else if (collections(); as list) {
        @if (list.length === 0) {
          <div class="card text-center">
            <p class="text-shade-600">{{ 'collections.empty' | transloco }}</p>
            <button
              type="button"
              class="mt-4"
              [class]="emailBlocked() ? 'btn-unavailable' : 'btn-primary'"
              [attr.aria-disabled]="emailBlocked() || null"
              [attr.aria-describedby]="emailBlocked() ? limitIds.collections : null"
              (click)="create()"
            >
              {{ 'collections.createFirst' | transloco }}
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
        <p role="status" class="text-center text-shade-500">{{ 'common.loading' | transloco }}</p>
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
  private readonly auth = inject(AuthService);

  protected readonly collections = signal<Collection[] | null>(null);
  protected readonly loadError = signal(false);
  protected readonly creating = signal(false);
  protected readonly emailBlocked = computed(
    () => this.auth.currentUser()?.emailConfirmed === false,
  );
  protected readonly limitIds = EMAIL_LIMIT_IDS;

  constructor() {
    this.collectionService.list().subscribe({
      next: (list) => this.collections.set(list),
      error: () => this.loadError.set(true),
    });
  }

  protected create(): void {
    if (!this.emailBlocked()) {
      this.creating.set(true);
    }
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
