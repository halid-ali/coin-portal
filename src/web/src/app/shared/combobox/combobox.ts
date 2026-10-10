import {
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, NgControl, Validators } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

import { errorMessage } from '../form-errors';
import { ComboboxMatch, ComboboxOption, filterOptions, fold } from './combobox-filter';

let nextId = 0;

/**
 * A text box with a short list under it that typing filters (user choices 2026-10-09; instead of a
 * native <select>, whose list a page cannot shorten): the best matches first, the matching part in
 * bold, options under group headings. ARIA combobox pattern: the focus stays in the box, arrow keys
 * move the highlight, Enter picks, Escape closes and brings the choice back. Only an option can be
 * chosen; leaving the box without picking keeps the old choice (an exact name is taken).
 *
 * `freeText`: any text, the options are suggestions (a coin's currency). The value is the text as
 * typed; nothing is highlighted by itself (Enter does not replace the text, it submits the form),
 * an option is taken with the arrow keys or a click, and the list hides when nothing matches.
 *
 * In a form it is the control (`formControlName`, it says when it is invalid or required, like
 * appField): `<app-combobox inputId="countryCode" formControlName="countryCode" …>` with
 * `<label for="countryCode">`, `<p id="countryCode-error">` / `-hint`. Elsewhere it is bound:
 * `[(value)]`, then `[control]` ties it to a form control's error and hint texts all the same
 * (a value the form converts, e.g. a collection's numeric id) and `disabled` closes it. `allLabel`
 * adds an option with the value '' on top (a filter's "All"); emptying the box picks it.
 *
 * `[searchable]="false"`: a short fixed list (user choice 2026-10-10: commemorative, photos, the
 * Euro denomination, sort, page size) with nothing to type. The box is then a button that opens the
 * list, like a native select: arrow keys, Home / End, Enter or Space pick, the first letters jump
 * to an option. `fitOptions` makes it as wide as its longest option (or placeholder), so a choice
 * does not change its width; `compact` matches the 38 px buttons beside it; an element marked
 * `comboboxIcon` (with `#comboboxIcon`) sits on its left. Without a <label for>, `ariaLabel` names it.
 */
@Component({
  selector: 'app-combobox',
  imports: [NgTemplateOutlet, TranslocoPipe],
  host: {
    class: 'relative',
    // As wide as its content when fitted (in a flex row, a flex item is that already)
    '[class.block]': '!fitOptions()',
    '[class.inline-block]': 'fitOptions()',
    // Faded while disabled, the arrow too (like a disabled button)
    '[class.opacity-60]': 'isDisabled()',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (searchable()) {
      <input
        #box
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        [id]="inputId()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="expanded() && matchCount() ? listId : null"
        [attr.aria-activedescendant]="expanded() && activeOption() ? optionId(activeIndex()) : null"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        [attr.aria-describedby]="field() ? inputId() + '-error ' + inputId() + '-hint' : null"
        [attr.placeholder]="(listLike() && placeholder()) || null"
        [attr.maxlength]="maxLength()"
        [disabled]="isDisabled()"
        [value]="text()"
        class="form-input pr-10 disabled:cursor-not-allowed"
        [class]="{ 'py-1.5': compact(), 'pl-9': !!icon() }"
        [class.ng-invalid]="field()?.invalid"
        [class.ng-touched]="field()?.touched"
        (click)="show()"
        (focus)="onFocus()"
        (input)="onInput(box.value)"
        (keydown)="onKey($event)"
      />
    } @else {
      <!-- The visible name and, when fitted, every option's name (and the placeholder) hidden in the
       same grid cell: the box is as wide as the longest of them -->
      <button
        #box
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        [id]="inputId()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="expanded() ? listId : null"
        [attr.aria-activedescendant]="expanded() && activeOption() ? optionId(activeIndex()) : null"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        [attr.aria-describedby]="field() ? inputId() + '-error ' + inputId() + '-hint' : null"
        [disabled]="isDisabled()"
        class="form-input grid pr-10 text-left disabled:cursor-not-allowed"
        [class]="{ 'py-1.5': compact(), 'pl-9': !!icon() }"
        [class.ng-invalid]="field()?.invalid"
        [class.ng-touched]="field()?.touched"
        (click)="toggle()"
        (keydown)="onKey($event)"
      >
        <span
          class="col-start-1 row-start-1 truncate"
          [class.text-shade-500]="!text() && !placeholderIsName()"
          >{{ text() || placeholder() }}</span
        >
        @if (fitOptions()) {
          @for (label of sizerLabels(); track $index) {
            <span
              class="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap"
              aria-hidden="true"
              >{{ label }}</span
            >
          }
        }
      </button>
    }
    <span
      class="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-shade-700"
      aria-hidden="true"
    >
      <ng-content select="[comboboxIcon]" />
    </span>
    @if (listLike()) {
      <svg
        viewBox="0 0 24 24"
        class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-shade-500 transition-transform"
        [class.rotate-180]="expanded()"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    }

    @if (expanded()) {
      <!-- As wide as its longest option: at least the box, at most 24rem (the coin form's box; every
       country name in the four languages fits) or the screen; turned to the box's right edge when it
       would leave the screen (user choices 2026-10-09) -->
      <div
        #popup
        class="absolute top-full z-40 mt-1 max-h-72 w-max max-w-[min(24rem,calc(100vw-2rem))] min-w-full overflow-y-auto rounded-xl border border-shade-200 bg-shade-0 p-1 shadow-lg"
        [class.left-0]="!alignEnd()"
        [class.right-0]="alignEnd()"
        [style.min-width.px]="listWidth() || null"
        (mousedown)="$event.preventDefault()"
      >
        @if (matchCount()) {
          <div role="listbox" [id]="listId" [attr.aria-label]="label()">
            @for (group of view(); track group.label; let g = $index) {
              @if (group.label === null) {
                @for (row of group.rows; track row.option.value) {
                  <ng-container
                    *ngTemplateOutlet="optionRow; context: { $implicit: row, indented: false }"
                  />
                }
              } @else {
                <div role="group" [attr.aria-labelledby]="listId + '-group-' + g">
                  <div
                    role="presentation"
                    [id]="listId + '-group-' + g"
                    class="px-2.5 pt-2 pb-1 text-xs font-semibold tracking-wide text-shade-500 uppercase"
                  >
                    {{ group.label }}
                  </div>
                  @for (row of group.rows; track row.option.value) {
                    <ng-container
                      *ngTemplateOutlet="optionRow; context: { $implicit: row, indented: true }"
                    />
                  }
                </div>
              }
            }
          </div>
        } @else {
          <p role="status" class="px-2.5 py-1.5 text-sm text-shade-500">
            {{ 'common.noMatch' | transloco }}
          </p>
        }
      </div>
    }

    <ng-template #optionRow let-match let-indented="indented">
      <div
        role="option"
        [id]="optionId(match.index)"
        [attr.aria-selected]="match.option.value === value()"
        class="flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 text-sm text-shade-700"
        [class]="indented ? 'pl-6' : 'pl-2.5'"
        [class.bg-shade-100]="match.index === activeIndex()"
        [class.ring-2]="match.index === activeIndex() && keyboard()"
        [class.ring-inset]="match.index === activeIndex() && keyboard()"
        [class.ring-focus]="match.index === activeIndex() && keyboard()"
        [class.font-semibold]="match.option.value === value()"
        (click)="choose(match.option.value)"
        (mousemove)="hover(match.index)"
      >
        <!-- The matching part bold in the accent color, like links (user choice 2026-10-09; at least
         4.5:1 on the list and the highlighted row with every accent, both themes) -->
        <!-- A name too long for the list wraps inside it, also without spaces (a user name, a currency) -->
        <span class="min-w-0 flex-1 wrap-anywhere">
          @if (match.at < 0) {
            {{ match.option.label }}
          } @else {
            {{ match.option.label.slice(0, match.at)
            }}<span class="font-semibold text-brand-700">{{
              match.option.label.slice(match.at, match.at + match.length)
            }}</span
            >{{ match.option.label.slice(match.at + match.length) }}
          }
        </span>
        <svg
          viewBox="0 0 24 24"
          class="size-4 shrink-0 text-brand-600"
          [class.invisible]="match.option.value !== value()"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5 10 17l9-10" />
        </svg>
      </div>
    </ng-template>
  `,
})
export class Combobox implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The form control, when it is one (it then registers itself as the value accessor). */
  protected readonly ngControl = inject(NgControl, { self: true, optional: true });

  /** The chosen option's value; '' for none (or the `allLabel` option). */
  readonly value = model('');
  readonly options = input.required<readonly ComboboxOption[]>();
  /** The box's id, for its <label for> and the -error / -hint texts. */
  readonly inputId = input.required<string>();
  /** Accessible name of the list (the field's label). */
  readonly label = input.required<string>();
  /** An option with the value '' on top, e.g. "All". */
  readonly allLabel = input<string | null>(null);
  /**
   * Shown in the empty box, e.g. "Choose…". A free text box without suggestions is a plain text box
   * and shows none (like the other typed fields; their examples are in the hint under them).
   */
  readonly placeholder = input('');
  /** Any text; the options are suggestions. */
  readonly freeText = input(false, { transform: booleanAttribute });
  readonly maxLength = input<number | null>(null);
  /** Without formControlName: the form control whose error and hint texts it is tied to. */
  readonly control = input<AbstractControl | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** False: nothing to type, the box is a button that opens the list (a short fixed list). */
  readonly searchable = input(true, { transform: booleanAttribute });
  /** As wide as the longest option or the placeholder (only without typing). */
  readonly fitOptions = input(false, { transform: booleanAttribute });
  /** The names a fitted box makes room for instead of the options (e.g. one that comes and goes). */
  readonly fitLabels = input<readonly string[] | null>(null);
  /** The 38 px height of the buttons beside it (py-1.5). */
  readonly compact = input(false, { transform: booleanAttribute });
  /**
   * The placeholder is the box's name (no label above it, e.g. "Sort"): shown like a value, not
   * faded, so the box does not look unavailable (only without typing).
   */
  readonly placeholderIsName = input(false, { transform: booleanAttribute });
  /** The box's name when no <label for> names it. */
  readonly ariaLabel = input<string | null>(null);

  /** An element marked `comboboxIcon` on the box's left: the text then starts after it. */
  protected readonly icon = contentChild<ElementRef>('comboboxIcon');

  /** A list to choose from: the arrow and the placeholder; free text only with suggestions. */
  protected readonly listLike = computed(() => !this.freeText() || this.options().length > 0);

  protected readonly listId = `combobox-${++nextId}`;
  protected readonly open = signal(false);
  /** The text typed since the list opened; null while nothing is typed (every option is listed). */
  protected readonly typed = signal<string | null>(null);
  protected readonly activeIndex = signal(0);
  /** The highlight moved by the keys: it then also gets the focus ring, like the language list. */
  protected readonly keyboard = signal(false);
  /** Disabled by the form control. */
  private readonly controlDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());

  private readonly allOptions = computed<ComboboxOption[]>(() => {
    const all = this.allLabel();
    return all === null ? [...this.options()] : [{ value: '', label: all }, ...this.options()];
  });
  protected readonly groups = computed(() => filterOptions(this.allOptions(), this.typed() ?? ''));
  /** The listed options in their order on screen (the keys walk them). */
  private readonly listed = computed(() => this.groups().flatMap((g) => g.matches));
  /** The groups with each option's place in that order (its id, the highlight). */
  protected readonly view = computed(() => {
    let index = 0;
    return this.groups().map((g) => ({
      label: g.label,
      rows: g.matches.map((m): ComboboxMatch & { index: number } => ({ ...m, index: index++ })),
    }));
  });
  protected readonly matchCount = computed(() => this.listed().length);
  protected readonly activeOption = computed(() => this.listed()[this.activeIndex()] ?? null);
  /** The list is shown: with free text only while some suggestion matches. */
  protected readonly expanded = computed(
    () => this.open() && (!this.freeText() || this.matchCount() > 0),
  );

  /** The chosen option's name while nothing is typed. */
  protected readonly text = computed(() => {
    const typed = this.typed();
    if (typed !== null) {
      return typed;
    }
    if (this.freeText()) {
      return this.value();
    }
    return this.allOptions().find((o) => o.value === this.value())?.label ?? '';
  });

  /** The names a fitted box makes room for. */
  protected readonly sizerLabels = computed(() => [
    this.placeholder(),
    ...(this.fitLabels() ?? this.allOptions().map((o) => o.label)),
  ]);

  private readonly box =
    viewChild.required<ElementRef<HTMLInputElement | HTMLButtonElement>>('box');
  /** First letters typed on a list-only box, cleared after a pause (like a native select). */
  private typeAhead = '';
  private typeAheadTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly popup = viewChild<ElementRef<HTMLElement>>('popup');
  /** The open list's width so far (0 while closed). */
  protected readonly listWidth = signal(0);
  protected readonly alignEnd = signal(false);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    // Keeps the highlighted option in sight in the scrolling list
    afterRenderEffect(() => {
      if (!this.open()) {
        return;
      }
      const id = this.optionId(this.activeIndex());
      this.host.nativeElement.querySelector(`#${id}`)?.scrollIntoView?.({ block: 'nearest' });
    });
    // The list keeps the widest it has been while open (it does not shrink as typing narrows it)
    // and turns to the right edge when it would leave the screen
    afterRenderEffect(() => {
      this.view();
      const popup = this.popup()?.nativeElement;
      if (!popup) {
        return;
      }
      const width = Math.ceil(popup.getBoundingClientRect().width);
      if (width > untracked(this.listWidth)) {
        this.listWidth.set(width);
      }
      const left = this.host.nativeElement.getBoundingClientRect().left;
      this.alignEnd.set(left + Math.max(width, untracked(this.listWidth)) > window.innerWidth - 16);
    });
  }

  protected optionId(index: number): string {
    return `${this.listId}-option-${index}`;
  }

  /** Its form control: the one it is, or the one it is tied to. */
  protected field(): AbstractControl | null {
    return this.ngControl?.control ?? this.control();
  }

  /** Invalid exactly when its error text is shown, like appField. */
  protected invalid(): boolean {
    const field = this.field();
    return !!field && errorMessage(field) !== null;
  }

  protected required(): boolean {
    return this.field()?.hasValidator(Validators.required) ?? false;
  }

  protected onFocus(): void {
    // The whole name selected: typing replaces it
    this.selectText();
  }

  private selectText(): void {
    const box = this.box().nativeElement;
    if (box instanceof HTMLInputElement) {
      box.select();
    }
  }

  /** The list-only box's click: opens or closes the list. */
  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.show();
    }
  }

  protected show(): void {
    if (this.open() || this.isDisabled()) {
      return;
    }
    this.typed.set(null);
    this.keyboard.set(false);
    this.selectText();
    const chosen = this.listed().findIndex((m) => m.option.value === this.value());
    this.activeIndex.set(this.freeText() ? chosen : Math.max(0, chosen));
    this.open.set(true);
  }

  protected onInput(text: string): void {
    this.typed.set(text);
    this.activeIndex.set(this.freeText() ? -1 : 0);
    this.open.set(true);
    if (this.freeText()) {
      // The text is the value, as in a plain text box
      this.value.set(text);
      this.onChange(text);
    }
  }

  protected hover(index: number): void {
    this.activeIndex.set(index);
    this.keyboard.set(false);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.searchable()) {
      this.onListKey(event);
      return;
    }
    const last = this.matchCount() - 1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!this.open()) {
          this.show();
        } else if (last >= 0) {
          const down = event.key === 'ArrowDown';
          this.activeIndex.update((i) => (down ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1));
        }
        this.keyboard.set(true);
        break;
      case 'Enter': {
        const active = this.expanded() ? this.activeOption() : null;
        if (!active && (this.freeText() || !this.open())) {
          this.close();
          return; // the form's Enter
        }
        if (active) {
          this.choose(active.option.value);
        }
        break;
      }
      case 'Escape':
        if (!this.expanded()) {
          this.close();
          return; // e.g. a dialog's Escape
        }
        this.close();
        this.selectText();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /** Keys of the list-only box, like a native select (and the ARIA select-only combobox). */
  private onListKey(event: KeyboardEvent): void {
    const last = this.matchCount() - 1;
    const letter = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    // Space inside a run of typed letters is part of the name ("2 €")
    if (letter && (event.key !== ' ' || this.typeAhead)) {
      this.jumpTo(event.key);
    } else {
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
          if (!this.open()) {
            this.show();
          } else {
            const down = event.key === 'ArrowDown';
            this.activeIndex.update((i) =>
              down ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1,
            );
          }
          this.keyboard.set(true);
          break;
        case 'Home':
        case 'End':
          if (!this.open()) {
            return;
          }
          this.activeIndex.set(event.key === 'Home' ? 0 : last);
          this.keyboard.set(true);
          break;
        case 'Enter':
        case ' ': {
          const active = this.open() ? this.activeOption() : null;
          if (active) {
            this.choose(active.option.value);
          } else {
            this.show();
            this.keyboard.set(true);
          }
          break;
        }
        case 'Escape':
          if (!this.open()) {
            return; // e.g. a dialog's Escape
          }
          this.close();
          break;
        default:
          return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * The first option whose name starts with the letters typed so far, from the highlighted one on;
   * the same letter again moves to the next such option. Opens the list on it, without choosing.
   */
  private jumpTo(letter: string): void {
    clearTimeout(this.typeAheadTimer);
    this.typeAhead += letter;
    this.typeAheadTimer = setTimeout(() => (this.typeAhead = ''), 500);
    const typed = fold(this.typeAhead);
    const repeated = [...typed].every((c) => c === typed[0]);
    const search = repeated ? typed[0] : typed;
    this.show();
    const options = this.listed();
    const from = this.activeIndex() + (repeated ? 1 : 0);
    for (let i = 0; i < options.length; i++) {
      const index = (from + i) % options.length;
      if (fold(options[index].option.label).startsWith(search)) {
        this.activeIndex.set(index);
        this.keyboard.set(true);
        return;
      }
    }
  }

  protected choose(value: string): void {
    this.close();
    if (value !== this.value()) {
      this.value.set(value);
      this.onChange(value);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) {
      return;
    }
    const typed = this.typed()?.trim();
    if (typed !== undefined && this.open() && !this.freeText()) {
      // A typed name that is an option's (or nothing, with an "All" option) is taken
      const exact = this.listed().find(
        (m) => m.at === 0 && m.length === m.option.label.length,
      )?.option;
      if (exact) {
        this.choose(exact.value);
      } else if (typed === '' && this.allLabel() !== null) {
        this.choose('');
      }
    }
    this.close();
    this.onTouched();
  }

  private close(): void {
    this.open.set(false);
    this.typed.set(null);
    this.listWidth.set(0);
    // Letters typed for an earlier list do not run on into the next
    this.typeAhead = '';
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.controlDisabled.set(disabled);
  }
}
