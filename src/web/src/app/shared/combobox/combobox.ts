import {
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NgControl, Validators } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

import { errorMessage } from '../form-errors';
import { ComboboxMatch, ComboboxOption, filterOptions } from './combobox-filter';

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
 * `[(value)]`. `allLabel` adds an option with the value '' on top (a filter's "All"); emptying
 * the box picks it.
 */
@Component({
  selector: 'app-combobox',
  imports: [NgTemplateOutlet, TranslocoPipe],
  host: {
    class: 'relative block',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <input
      #box
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      aria-autocomplete="list"
      [id]="inputId()"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="expanded() && matchCount() ? listId : null"
      [attr.aria-activedescendant]="expanded() && activeOption() ? optionId(activeIndex()) : null"
      [attr.aria-invalid]="invalid() ? 'true' : null"
      [attr.aria-required]="required() ? 'true' : null"
      [attr.aria-describedby]="ngControl ? inputId() + '-error ' + inputId() + '-hint' : null"
      [attr.placeholder]="placeholder() || null"
      [attr.maxlength]="maxLength()"
      [disabled]="disabled()"
      [value]="text()"
      class="form-input pr-10"
      [class.ng-invalid]="ngControl?.invalid"
      [class.ng-touched]="ngControl?.touched"
      (click)="show()"
      (focus)="onFocus()"
      (input)="onInput(box.value)"
      (keydown)="onKey($event)"
    />
    @if (!freeText() || options().length) {
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
      <div
        class="absolute top-full left-0 z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-shade-200 bg-shade-0 p-1 shadow-lg"
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
        <span class="flex-1">
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
  /** Shown in the empty box, e.g. "Choose…". */
  readonly placeholder = input('');
  /** Any text; the options are suggestions. */
  readonly freeText = input(false, { transform: booleanAttribute });
  readonly maxLength = input<number | null>(null);

  protected readonly listId = `combobox-${++nextId}`;
  protected readonly open = signal(false);
  /** The text typed since the list opened; null while nothing is typed (every option is listed). */
  protected readonly typed = signal<string | null>(null);
  protected readonly activeIndex = signal(0);
  /** The highlight moved by the keys: it then also gets the focus ring, like the language list. */
  protected readonly keyboard = signal(false);
  protected readonly disabled = signal(false);

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

  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');
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
  }

  protected optionId(index: number): string {
    return `${this.listId}-option-${index}`;
  }

  /** Invalid exactly when its error text is shown, like appField. */
  protected invalid(): boolean {
    return !!this.ngControl && errorMessage(this.ngControl.control) !== null;
  }

  protected required(): boolean {
    return this.ngControl?.control?.hasValidator(Validators.required) ?? false;
  }

  protected onFocus(): void {
    // The whole name selected: typing replaces it
    this.box().nativeElement.select();
  }

  protected show(): void {
    if (this.open() || this.disabled()) {
      return;
    }
    this.typed.set(null);
    this.keyboard.set(false);
    this.box().nativeElement.select();
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
        this.box().nativeElement.select();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
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
    this.disabled.set(disabled);
  }
}
