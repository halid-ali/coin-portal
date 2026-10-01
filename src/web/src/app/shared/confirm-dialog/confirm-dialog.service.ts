import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
} from '@angular/core';

import { ConfirmDialog, ConfirmOptions } from './confirm-dialog';

/** Opens a ConfirmDialog attached to <body>; resolves true only when the user confirms. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return this.open(options).then((result) => result.confirmed);
  }

  /** Like confirm(), with the note field; resolves to its trimmed text, or null when cancelled. */
  confirmWithNote(
    options: ConfirmOptions & Required<Pick<ConfirmOptions, 'note'>>,
  ): Promise<string | null> {
    return this.open(options).then((result) => (result.confirmed ? result.note.trim() : null));
  }

  private open(options: ConfirmOptions): Promise<{ confirmed: boolean; note: string }> {
    return new Promise((resolve) => {
      const ref = createComponent(ConfirmDialog, { environmentInjector: this.injector });
      ref.setInput('options', options);

      const subscription = ref.instance.closed.subscribe((confirmed) => {
        subscription.unsubscribe();
        const note = ref.instance.noteText();
        this.appRef.detachView(ref.hostView);
        ref.destroy();
        resolve({ confirmed, note });
      });

      this.appRef.attachView(ref.hostView);
      this.document.body.appendChild(ref.location.nativeElement);
    });
  }
}
