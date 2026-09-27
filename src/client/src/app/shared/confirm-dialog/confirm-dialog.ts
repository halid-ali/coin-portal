import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button and warning icon for destructive actions. */
  danger?: boolean;
}

let nextId = 0;

/**
 * Modal confirmation built on the native <dialog> element: showModal() makes the page
 * behind inert, traps focus and closes on Escape. Opened via ConfirmDialogService.
 */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="messageId"
      class="dialog-panel max-w-md"
      (click)="onDialogClick($event)"
      (close)="onClose()"
    >
      <div class="p-6">
        <div class="flex items-start gap-4">
          @if (options().danger) {
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
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
            <h2 [id]="titleId" class="text-lg font-semibold text-slate-900">
              {{ options().title }}
            </h2>
            <p [id]="messageId" class="mt-2 text-sm text-slate-600">{{ options().message }}</p>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <!-- Cancel gets the initial focus, the safe choice for destructive actions -->
          <button type="button" class="btn-secondary" autofocus (click)="close(false)">
            {{ options().cancelText ?? 'Vazgeç' }}
          </button>
          <button
            type="button"
            [class.btn-danger]="options().danger"
            [class.btn-primary]="!options().danger"
            (click)="close(true)"
          >
            {{ options().confirmText ?? 'Onayla' }}
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

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private result = false;

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

  // A click on the <dialog> element itself (not its content) is a click on the backdrop
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close(false);
    }
  }
}
