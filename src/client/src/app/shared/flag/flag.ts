import { Component, input } from '@angular/core';

import { Language } from '../../core/i18n/languages';

let nextId = 0;

/**
 * Small rectangular flag for a UI language (English: United Kingdom). Inline SVG, because emoji
 * flags show up as letters on Windows. The host sets the size; the default is 20×14 px and the
 * flag is cropped to fill it.
 */
@Component({
  selector: 'app-flag',
  host: {
    class:
      'inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/15',
    'aria-hidden': 'true',
  },
  template: `
    @switch (code()) {
      @case ('en') {
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" class="block size-full">
          <clipPath [attr.id]="clipId">
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
          <path
            d="M0,0 L60,30 M60,0 L0,30"
            [attr.clip-path]="'url(#' + clipId + ')'"
            stroke="#C8102E"
            stroke-width="4"
          />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" />
        </svg>
      }
      @case ('de') {
        <svg viewBox="0 0 5 3" preserveAspectRatio="none" class="block size-full">
          <rect width="5" height="1" fill="#000" />
          <rect y="1" width="5" height="1" fill="#DD0000" />
          <rect y="2" width="5" height="1" fill="#FFCE00" />
        </svg>
      }
      @case ('tr') {
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" class="block size-full">
          <rect width="1200" height="800" fill="#E30A17" />
          <circle cx="425" cy="400" r="200" fill="#fff" />
          <circle cx="475" cy="400" r="160" fill="#E30A17" />
          <polygon
            fill="#fff"
            points="583.334,400 764.235,458.779 652.431,304.894 652.431,495.106 764.235,341.221"
          />
        </svg>
      }
      @case ('bg') {
        <svg viewBox="0 0 5 3" preserveAspectRatio="none" class="block size-full">
          <rect width="5" height="1" fill="#fff" />
          <rect y="1" width="5" height="1" fill="#00966E" />
          <rect y="2" width="5" height="1" fill="#D62612" />
        </svg>
      }
    }
  `,
})
export class Flag {
  readonly code = input.required<Language>();

  // The clip path id must be unique on the page, several flags are shown at once
  protected readonly clipId = `flag-clip-${++nextId}`;
}
