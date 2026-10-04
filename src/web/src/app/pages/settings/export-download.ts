import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Directive, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { httpErrorKey } from '../../core/http/problem-details';
import { ACCOUNT_EXPORT_URL, SettingsService } from '../../core/settings/settings.service';

/**
 * The "download my data" link. The download stays a plain one (the browser streams the ZIP), but a
 * click checks the session first: a failed plain download tells the page nothing, so an ended
 * session would only show as a failed file in the browser. A 401 goes through the interceptor
 * (signed out, to the login page); other errors are in error() as a translation key.
 */
@Directive({
  selector: 'a[appExportDownload]',
  exportAs: 'appExportDownload',
  host: {
    '[attr.href]': 'url',
    download: '',
    '[attr.aria-disabled]': "busy() ? 'true' : null",
    '(click)': 'start($event)',
  },
})
export class ExportDownload {
  private readonly settings = inject(SettingsService);
  private readonly document = inject(DOCUMENT);

  protected readonly url = ACCOUNT_EXPORT_URL;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  protected async start(event: MouseEvent): Promise<void> {
    // Opening in a new tab or "save link as" stays the browser's
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.settings.get());
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status !== 401) {
        this.error.set(httpErrorKey(err));
      }
      return;
    } finally {
      this.busy.set(false);
    }
    // A separate link, so this click handler does not run again
    const link = this.document.createElement('a');
    link.href = this.url;
    link.download = '';
    this.document.body.append(link);
    link.click();
    link.remove();
  }
}
