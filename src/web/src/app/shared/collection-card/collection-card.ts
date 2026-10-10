import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionSummary } from '../../core/collections/collection.models';
import { coverUrl } from '../../core/collections/collection.service';
import { PluralPipe } from '../../core/i18n/plural';
import { CollectionPlaceholder } from '../collection-placeholder/collection-placeholder';
import { VisibilityBadge } from '../visibility-badge/visibility-badge';
import { ImageSkeleton } from '../image-skeleton';

/** Collection card with cover, name, description and coin count (my collections, profiles). */
@Component({
  selector: 'app-collection-card',
  imports: [ImageSkeleton, RouterLink, PluralPipe, CollectionPlaceholder, VisibilityBadge],
  host: { class: 'block h-full' },
  template: `
    <a
      [routerLink]="link()"
      class="card group block h-full overflow-hidden p-0 transition-colors hover:border-brand-300
             focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
    >
      <div class="relative aspect-video overflow-hidden bg-shade-100">
        @if (cover(); as src) {
          <img
            appImageSkeleton
            [src]="src"
            alt=""
            loading="lazy"
            decoding="async"
            class="size-full object-cover duration-300 motion-safe:transition-transform motion-safe:group-hover:scale-[1.03]"
          />
        } @else {
          <div class="flex size-full items-center justify-center">
            <app-collection-placeholder class="aspect-square h-4/5 text-shade-300" />
          </div>
        }
        @if (showVisibility()) {
          <app-visibility-badge
            class="absolute top-2 left-2 shadow-sm"
            [visibility]="collection().visibility"
            [moderationLocked]="!!collection().moderationLocked"
          />
        }
      </div>
      <div class="space-y-1 p-4">
        <h2 class="truncate font-semibold text-shade-900">{{ collection().name }}</h2>
        @if (collection().description) {
          <p class="line-clamp-2 text-sm text-shade-600">{{ collection().description }}</p>
        }
        <p class="text-sm text-shade-500">
          {{ 'common.coinCount' | plural: collection().coinCount }}
        </p>
      </div>
    </a>
  `,
})
export class CollectionCard {
  readonly collection = input.required<CollectionSummary>();
  readonly link = input.required<string | unknown[]>();
  /** The owner sees the visibility; on a profile everything shown is public anyway. */
  readonly showVisibility = input(false);

  protected readonly cover = computed(() => coverUrl(this.collection()));
}
