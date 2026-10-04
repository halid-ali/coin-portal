import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { LANGUAGES, Language } from '../../core/i18n/languages';
import { Flag } from '../flag/flag';

let nextId = 0;

/**
 * Language dropdown with flags (a native <select> cannot show images). Listbox pattern: the
 * button opens the list, arrow keys / Home / End move, Enter or Space picks, Escape closes.
 * Controlled: shows `value`, emits `valueChange`; the parent applies (and saves) the choice.
 */
@Component({
  selector: 'app-language-select',
  imports: [Flag],
  host: {
    class: 'relative inline-block',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="flex items-center gap-2 rounded-lg border border-shade-300 bg-shade-0 py-1.5 pr-2 pl-2.5 text-sm
             text-shade-800 shadow-sm transition-colors hover:bg-shade-50 focus-visible:ring-2
             focus-visible:ring-focus focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listId"
      [attr.aria-label]="label() ? label() + ': ' + current().name : null"
      [disabled]="disabled()"
      (click)="toggle($event)"
      (keydown.arrowdown)="openWithKeyboard($event)"
      (keydown.arrowup)="openWithKeyboard($event)"
    >
      <app-flag [code]="current().code" />
      <span [attr.lang]="current().code">{{ current().name }}</span>
      <svg
        viewBox="0 0 24 24"
        class="size-4 text-shade-500 transition-transform"
        [class.rotate-180]="open()"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    @if (open()) {
      <ul
        #list
        role="listbox"
        tabindex="-1"
        [id]="listId"
        [attr.aria-label]="label()"
        [attr.aria-activedescendant]="listId + '-' + active()"
        class="absolute z-40 w-max min-w-full rounded-xl text-left border border-shade-200 bg-shade-0 p-1 shadow-lg
               focus:outline-none"
        [class]="placementClass()"
        (keydown)="onListKey($event)"
      >
        @for (l of languages; track l.code; let i = $index) {
          <li
            role="option"
            [id]="listId + '-' + i"
            [attr.lang]="l.code"
            [attr.aria-selected]="l.code === value()"
            class="flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 pl-2.5 text-sm text-shade-700"
            [class.bg-shade-100]="i === active()"
            [class.ring-2]="i === active() && keyboard()"
            [class.ring-inset]="i === active() && keyboard()"
            [class.ring-focus]="i === active() && keyboard()"
            [class.font-semibold]="l.code === value()"
            (click)="choose(l.code)"
            (mouseenter)="hover(i)"
          >
            <app-flag [code]="l.code" />
            <span class="flex-1">{{ l.name }}</span>
            <svg
              viewBox="0 0 24 24"
              class="size-4 text-brand-600"
              [class.invisible]="l.code !== value()"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12.5 10 17l9-10" />
            </svg>
          </li>
        }
      </ul>
    }
  `,
})
export class LanguageSelect {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = input.required<Language>();
  /** Accessible name, e.g. the translated "Language". */
  readonly label = input('');
  /** Where the list opens: below (default) or above the button (e.g. in the footer). */
  readonly placement = input<'bottom' | 'top'>('bottom');
  /** Which edges of button and list line up; 'end' keeps the list inside at the right edge. */
  readonly align = input<'start' | 'end'>('start');
  readonly disabled = input(false);
  readonly valueChange = output<Language>();

  protected readonly languages = LANGUAGES;
  protected readonly listId = `language-list-${++nextId}`;
  protected readonly open = signal(false);
  /** Highlighted option (index), moved by the keyboard and the mouse. */
  protected readonly active = signal(0);
  /**
   * Moved by the keys: the highlight then also gets the focus ring (the list keeps the focus,
   * the light hover background alone is hard to see). The mouse shows the hover background only.
   */
  protected readonly keyboard = signal(false);
  protected readonly current = computed(
    () => LANGUAGES.find((l) => l.code === this.value()) ?? LANGUAGES[0],
  );
  protected readonly placementClass = computed(
    () =>
      (this.placement() === 'top' ? 'bottom-full mb-1 ' : 'top-full mt-1 ') +
      (this.align() === 'end' ? 'right-0' : 'left-0'),
  );

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly list = viewChild<ElementRef<HTMLUListElement>>('list');

  constructor() {
    // The open list takes the focus, so the keys work right away
    effect(() => this.list()?.nativeElement.focus());
  }

  protected toggle(event: MouseEvent): void {
    if (this.open()) {
      this.close();
    } else {
      this.show();
      // Enter or Space on the button also clicks it, without a pointer (detail 0)
      this.keyboard.set(event.detail === 0);
    }
  }

  protected openWithKeyboard(event: Event): void {
    event.preventDefault();
    this.show();
    this.keyboard.set(true);
  }

  protected hover(index: number): void {
    this.active.set(index);
    this.keyboard.set(false);
  }

  protected onListKey(event: KeyboardEvent): void {
    const last = this.languages.length - 1;
    this.keyboard.set(true);
    switch (event.key) {
      case 'ArrowDown':
        this.active.update((i) => (i >= last ? 0 : i + 1));
        break;
      case 'ArrowUp':
        this.active.update((i) => (i <= 0 ? last : i - 1));
        break;
      case 'Home':
        this.active.set(0);
        break;
      case 'End':
        this.active.set(last);
        break;
      case 'Enter':
      case ' ':
        this.choose(this.languages[this.active()].code);
        break;
      case 'Escape':
        this.close(true);
        break;
      case 'Tab':
        this.close();
        return;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  protected choose(lang: Language): void {
    this.close(true);
    if (lang !== this.value()) {
      this.valueChange.emit(lang);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.host.nativeElement.contains(next)) {
      this.close();
    }
  }

  private show(): void {
    this.active.set(Math.max(0, this.languages.indexOf(this.current())));
    this.open.set(true);
  }

  private close(refocus = false): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    if (refocus) {
      this.trigger().nativeElement.focus();
    }
  }
}
