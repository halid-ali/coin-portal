import { Component } from '@angular/core';

/**
 * A collection card's placeholder while the cards load (`.skeleton`, user choice 2026-10-10): the
 * cover, the name, a description line and the coin count, as `CollectionCard` lays them out.
 */
@Component({
  selector: 'app-collection-card-skeleton',
  host: { class: 'block h-full', 'aria-hidden': 'true' },
  template: `
    <div class="card h-full overflow-hidden p-0">
      <div class="skeleton aspect-video rounded-none"></div>
      <div class="space-y-3 p-4">
        <div class="skeleton h-4 w-1/2 rounded-full"></div>
        <div class="skeleton h-3 w-3/4 rounded-full"></div>
        <div class="skeleton h-3 w-1/4 rounded-full"></div>
      </div>
    </div>
  `,
})
export class CollectionCardSkeleton {}
