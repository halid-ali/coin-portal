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
    return new Promise((resolve) => {
      const ref = createComponent(ConfirmDialog, { environmentInjector: this.injector });
      ref.setInput('options', options);

      const subscription = ref.instance.closed.subscribe((result) => {
        subscription.unsubscribe();
        this.appRef.detachView(ref.hostView);
        ref.destroy();
        resolve(result);
      });

      this.appRef.attachView(ref.hostView);
      this.document.body.appendChild(ref.location.nativeElement);
    });
  }
}
