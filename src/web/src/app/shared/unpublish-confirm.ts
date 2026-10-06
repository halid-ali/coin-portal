import { Injectable, inject } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { Observable, firstValueFrom } from 'rxjs';

import { UnpublishedCollection, wouldUnpublish } from '../core/collections/publication';
import { cachedIntl } from '../core/i18n/intl-cache';
import { LanguageService } from '../core/i18n/language.service';
import { plural } from '../core/i18n/plural';
import { ConfirmDialogService } from './confirm-dialog/confirm-dialog.service';

/** The user kept the collection public: the change was not made. */
export const UNPUBLISH_DECLINED = Symbol('unpublish declined');

/**
 * Runs a change that may take a public collection below its requirements. The API refuses such
 * a change (409 would_unpublish); then the user is asked, and on yes the change runs again
 * confirmed and the collection becomes "link only". Other errors are thrown as they are.
 */
@Injectable({ providedIn: 'root' })
export class UnpublishConfirm {
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly language = inject(LanguageService);

  async run<T>(
    request: (unpublish: boolean) => Observable<T>,
  ): Promise<T | typeof UNPUBLISH_DECLINED> {
    try {
      return await firstValueFrom(request(false));
    } catch (err) {
      const collections = wouldUnpublish(err);
      if (!collections) {
        throw err;
      }
      if (!(await this.ask(collections))) {
        return UNPUBLISH_DECLINED;
      }
      return await firstValueFrom(request(true));
    }
  }

  // A move can break both collections; the text follows the count, the names the language's
  // quotes and list ("A" and "B")
  private ask(collections: UnpublishedCollection[]): Promise<boolean> {
    const lang = this.language.current();
    const list = cachedIntl(
      `list|${lang}`,
      () => new Intl.ListFormat(lang, { type: 'conjunction' }),
    );
    const names = list.format(
      collections.map((c) => translate('publication.unpublish.quoted', { name: c.name })),
    );
    return this.confirmDialog.confirm({
      title: plural('publication.unpublish.title', collections.length, lang),
      message: plural('publication.unpublish.message', collections.length, lang, { names }),
      confirmText: translate('publication.unpublish.confirm'),
      cancelText: translate('common.cancel'),
    });
  }
}
