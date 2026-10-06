import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

let nextId = 0;

/**
 * Next to a user's name in the panel while their e-mail address is not verified: an envelope with
 * a clock, in the gray of the "Unverified" status. Shown whatever the status says, so a locked
 * user who never verified is told apart. The words are there for screen readers and on hover.
 */
@Component({
  selector: 'app-unverified-mark',
  imports: [TranslocoPipe],
  host: { class: 'inline-flex shrink-0' },
  template: `
    <span class="inline-flex text-shade-500" [title]="'admin.users.unverifiedMark' | transloco">
      <svg
        viewBox="0 0 24 24"
        class="size-4.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- The envelope stops short of the clock (no background behind it, so rows can be tinted) -->
        <mask [id]="maskId">
          <rect width="24" height="24" fill="white" />
          <circle cx="19" cy="18" r="6" fill="black" />
        </mask>
        <g [attr.mask]="'url(#' + maskId + ')'">
          <rect x="2" y="4.5" width="18" height="13" rx="2.5" />
          <path d="m2.5 6 8.5 6 8.5-6" />
        </g>
        <circle cx="19" cy="18" r="4.25" stroke-width="1.5" />
        <path d="M19 15.75V18l1.5 1" stroke-width="1.5" />
      </svg>
      <span class="sr-only">{{ 'admin.users.unverifiedMark' | transloco }}</span>
    </span>
  `,
})
export class UnverifiedMark {
  protected readonly maskId = `unverified-mark-cut-${nextId++}`;
}
