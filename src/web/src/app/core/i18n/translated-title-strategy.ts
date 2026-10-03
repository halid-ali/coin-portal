import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/** The site's name, in page titles and wherever the client writes it out of a template. */
export const APP_NAME = 'CoinVitrine';

/**
 * Route titles are translation keys (e.g. title: 'titles.login'); the page title becomes
 * "<text> · CoinVitrine", or just the app name for routes without one. A language switch
 * updates it, unless the page has set its own title since (e.g. a collection's name).
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);

  private key: string | undefined;
  private lastSet: string | null = null;

  constructor() {
    super();
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.lastSet !== null && this.title.getTitle() === this.lastSet) {
        this.apply();
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key = this.buildTitle(snapshot);
    this.apply();
  }

  private apply(): void {
    const text = this.key ? `${this.transloco.translate(this.key)} · ${APP_NAME}` : APP_NAME;
    this.title.setTitle(text);
    this.lastSet = text;
  }
}
