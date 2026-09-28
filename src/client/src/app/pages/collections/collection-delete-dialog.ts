import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { Collection } from '../../core/collections/collection.models';
import {
  CollectionService,
  collectionErrorMessage,
} from '../../core/collections/collection.service';
import { PluralPipe } from '../../core/i18n/plural';

let nextId = 0;

/**
 * Deletes a collection after the user types its name (also when it is empty). If it has coins
 * they are moved to another collection (default, the safe choice) or deleted with it. The
 * user's only collection cannot be deleted. Emits true when deleted.
 */
@Component({
  selector: 'app-collection-delete-dialog',
  imports: [TranslocoPipe, PluralPipe],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="dialog-panel max-w-md"
      (close)="onClose()"
    >
      <div class="space-y-5 p-6">
        <div class="flex items-start gap-4">
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
          <div>
            <h2 [id]="titleId" class="text-lg font-semibold">
              {{ 'collectionDelete.title' | transloco }}
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              <strong class="font-semibold text-slate-900">{{ collection().name }}</strong>
              {{ 'collectionDelete.willBeDeleted' | transloco }}
              @if (collection().coinCount) {
                {{ 'collectionDelete.containsCoins' | plural: collection().coinCount }}
              } @else {
                {{ 'collectionDelete.isEmpty' | transloco }}
              }
            </p>
          </div>
        </div>

        @if (targets().length === 0) {
          <p class="alert-error">{{ 'collections.errors.last_collection' | transloco }}</p>
        } @else {
          @if (collection().coinCount) {
            <fieldset class="space-y-3">
              <legend class="form-label">
                {{ 'collectionDelete.whatAboutCoins' | transloco }}
              </legend>
              <label
                class="flex items-start gap-3 rounded-lg border border-slate-200 p-3 has-checked:border-amber-400 has-checked:bg-amber-50"
              >
                <input
                  type="radio"
                  name="{{ titleId }}-mode"
                  class="mt-1 accent-amber-500"
                  [checked]="mode() === 'move'"
                  (change)="mode.set('move')"
                />
                <span class="flex-1 space-y-2">
                  <span class="block text-sm font-medium text-slate-900">{{
                    'collectionDelete.moveTo' | transloco
                  }}</span>
                  <select
                    class="form-input py-1.5"
                    #targetSelect
                    [disabled]="mode() !== 'move'"
                    [attr.aria-label]="'collectionDelete.moveTarget' | transloco"
                    (change)="targetId.set(+targetSelect.value)"
                  >
                    @for (t of targets(); track t.id) {
                      <option [value]="t.id" [selected]="t.id === targetId()">{{ t.name }}</option>
                    }
                  </select>
                </span>
              </label>
              <label
                class="flex items-start gap-3 rounded-lg border border-slate-200 p-3 has-checked:border-red-300 has-checked:bg-red-50"
              >
                <input
                  type="radio"
                  name="{{ titleId }}-mode"
                  class="mt-1 accent-red-600"
                  [checked]="mode() === 'delete'"
                  (change)="mode.set('delete')"
                />
                <span class="text-sm">
                  <span class="block font-medium text-slate-900">{{
                    'collectionDelete.deleteCoins' | transloco
                  }}</span>
                  <span class="text-slate-600">{{
                    'collectionDelete.deleteCoinsNote' | plural: collection().coinCount
                  }}</span>
                </span>
              </label>
            </fieldset>
          }

          <div>
            <label [for]="titleId + '-confirm'" class="form-label">
              {{ 'collectionDelete.typeName' | transloco }}
              <span class="font-semibold text-slate-900 select-all">{{ collection().name }}</span>
            </label>
            <input
              [id]="titleId + '-confirm'"
              type="text"
              class="form-input"
              autocomplete="off"
              autofocus
              [value]="typed()"
              (input)="typed.set($any($event.target).value)"
              (keydown.enter)="confirmed() && remove()"
            />
          </div>
        }

        @if (error()) {
          <p role="alert" class="alert-error">{{ error() }}</p>
        }

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" (click)="close()">
            {{ 'common.cancel' | transloco }}
          </button>
          @if (targets().length) {
            <button
              type="button"
              class="btn-danger"
              [disabled]="!confirmed() || deleting()"
              (click)="remove()"
            >
              {{ (deleting() ? 'common.deleting' : 'collectionDelete.submit') | transloco }}
            </button>
          }
        </div>
      </div>
    </dialog>
  `,
})
export class CollectionDeleteDialog {
  private readonly collectionService = inject(CollectionService);

  readonly collection = input.required<Collection>();
  /** All of the user's collections; the others are the move targets. */
  readonly collections = input.required<Collection[]>();
  readonly closed = output<boolean>();

  protected readonly titleId = `collection-delete-${++nextId}`;
  protected readonly mode = signal<'move' | 'delete'>('move');
  protected readonly typed = signal('');
  protected readonly deleting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly targets = computed(() =>
    this.collections().filter((c) => c.id !== this.collection().id),
  );
  protected readonly targetId = signal<number | null>(null);

  /** Exact name, surrounding spaces ignored. */
  protected readonly confirmed = computed(() => this.typed().trim() === this.collection().name);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private result = false;

  constructor() {
    afterNextRender(() => {
      this.targetId.set(this.targets()[0]?.id ?? null);
      this.dialog().nativeElement.showModal();
    });
  }

  protected async remove(): Promise<void> {
    if (!this.confirmed()) {
      return;
    }
    const moveTo =
      this.collection().coinCount && this.mode() === 'move'
        ? (this.targetId() ?? undefined)
        : undefined;

    this.deleting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.collectionService.delete(this.collection().id, moveTo));
      this.result = true;
      this.dialog().nativeElement.close();
    } catch (err) {
      this.error.set(collectionErrorMessage(err as HttpErrorResponse));
    } finally {
      this.deleting.set(false);
    }
  }

  protected close(): void {
    this.result = false;
    this.dialog().nativeElement.close();
  }

  // Single exit point: buttons and Escape both end up here
  protected onClose(): void {
    this.closed.emit(this.result);
  }
}
