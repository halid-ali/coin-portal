import {
  Component,
  ElementRef,
  computed,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** Texts in the active language (translate them before calling confirm()). */
export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button and warning icon for destructive actions. */
  danger?: boolean;
  /** An optional text field, e.g. a reason (ConfirmDialogService.confirmWithNote). */
  note?: ConfirmNote;
  /** For what cannot be undone: the confirm button only works once this is typed exactly. */
  typeToConfirm?: { label: string; value: string };
}

export interface ConfirmNote {
  label: string;
  hint?: string;
  maxLength: number;
}

let nextId = 0;

/**
 * Modal confirmation built on the native <dialog> element: showModal() makes the page
 * behind inert, traps focus and closes on Escape. Opened via ConfirmDialogService.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [TranslocoPipe],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="messageId"
      class="dialog-panel max-w-md"
      (pointerdown)="onDialogPointerDown($event)"
      (click)="onDialogClick($event)"
      (close)="onClose()"
    >
      <div class="p-6">
        <div class="flex items-start gap-4">
          @if (options().danger) {
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-600"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="size-5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
                />
              </svg>
            </div>
          }
          <div>
            <h2 [id]="titleId" class="text-lg font-semibold text-shade-900">
              {{ options().title }}
            </h2>
            <p [id]="messageId" class="mt-2 text-sm text-shade-600">{{ options().message }}</p>
          </div>
        </div>

        @if (options().typeToConfirm; as type) {
          <div class="mt-4">
            <label [for]="typeId" class="form-label">
              {{ type.label }}
              <span class="font-semibold text-shade-900 select-all">{{ type.value }}</span>
            </label>
            <input
              [id]="typeId"
              type="text"
              class="form-input"
              autocomplete="off"
              autofocus
              [value]="typed()"
              (input)="typed.set(typeInput.value)"
              (keydown.enter)="typedMatches() && close(true)"
              #typeInput
            />
          </div>
        }

        @if (options().note; as note) {
          <div class="mt-4">
            <label [for]="noteId" class="form-label">{{ note.label }}</label>
            <textarea
              [id]="noteId"
              class="form-input"
              rows="3"
              [maxLength]="note.maxLength"
              [value]="noteText()"
              (input)="noteText.set(noteInput.value)"
              #noteInput
            ></textarea>
            <p class="form-hint flex justify-between gap-3">
              <span>{{ note.hint }}</span>
              <span class="shrink-0 tabular-nums"
                >{{ noteText().length }}/{{ note.maxLength }}</span
              >
            </p>
          </div>
        }

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <!-- Cancel gets the initial focus, the safe choice for destructive actions; with a name
             to type, the field gets it -->
          <button
            type="button"
            class="btn-secondary"
            [attr.autofocus]="options().typeToConfirm ? null : ''"
            (click)="close(false)"
          >
            {{ options().cancelText ?? ('common.cancel' | transloco) }}
          </button>
          <button
            type="button"
            [class.btn-danger]="options().danger"
            [class.btn-primary]="!options().danger"
            [disabled]="!typedMatches()"
            (click)="close(true)"
          >
            {{ options().confirmText ?? ('common.confirm' | transloco) }}
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class ConfirmDialog {
  readonly options = input.required<ConfirmOptions>();
  readonly closed = output<boolean>();

  protected readonly titleId = `confirm-title-${++nextId}`;
  protected readonly messageId = `confirm-message-${nextId}`;
  protected readonly noteId = `confirm-note-${nextId}`;
  protected readonly typeId = `confirm-type-${nextId}`;
  protected readonly typed = signal('');
  protected readonly typedMatches = computed(() => {
    const expected = this.options().typeToConfirm?.value;
    return expected === undefined || this.typed().trim() === expected;
  });
  /** Text of the optional note field, read by the service after closing. */
  readonly noteText = signal('');

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private result = false;
  private pressedOnBackdrop = false;

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected close(result: boolean): void {
    this.result = result;
    this.dialog().nativeElement.close();
  }

  // Single exit point: buttons, Escape and backdrop clicks all end up here
  protected onClose(): void {
    this.closed.emit(this.result);
  }

  protected onDialogPointerDown(event: PointerEvent): void {
    this.pressedOnBackdrop = event.target === this.dialog().nativeElement;
  }

  /**
   * A click on the <dialog> element itself (not its content) is a click on the backdrop. It closes
   * only when the press started there too (a text selection released outside the panel also
   * targets the dialog) and never with a text field, whose input would be lost.
   */
  protected onDialogClick(event: MouseEvent): void {
    const options = this.options();
    if (
      event.target === this.dialog().nativeElement &&
      this.pressedOnBackdrop &&
      !options.note &&
      !options.typeToConfirm
    ) {
      this.close(false);
    }
  }
}
