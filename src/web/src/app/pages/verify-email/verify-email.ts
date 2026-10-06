import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { httpErrorKey, problemCode } from '../../core/http/problem-details';
import { firstQueryParam } from '../../core/http/query-params';

type VerifyState = 'verifying' | 'done' | 'invalid' | 'failed';

/**
 * The link from the verification e-mail (/verify-email?token=…): confirms the address, signed in
 * or not (the link may be opened on another device). The secret leaves the address bar once used.
 */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, TranslocoPipe],
  host: { class: 'block' },
  template: `
    <div class="card mx-auto max-w-xl text-center">
      @switch (state()) {
        @case ('verifying') {
          <p role="status" class="text-shade-600">{{ 'verifyEmail.verifying' | transloco }}</p>
        }
        @case ('done') {
          <h1 class="text-xl font-semibold text-shade-900">
            {{ 'verifyEmail.doneTitle' | transloco }}
          </h1>
          <p class="mt-2 text-shade-600">{{ 'verifyEmail.doneText' | transloco }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            @if (auth.isAuthenticated()) {
              <a routerLink="/collections" class="btn-primary">{{
                'verifyEmail.toCollections' | transloco
              }}</a>
            } @else {
              <a routerLink="/login" class="btn-primary">{{ 'verifyEmail.signIn' | transloco }}</a>
            }
          </div>
        }
        @case ('invalid') {
          <h1 class="text-xl font-semibold text-shade-900">
            {{ 'verifyEmail.invalidTitle' | transloco }}
          </h1>
          <p class="mt-2 text-shade-600">{{ 'verifyEmail.invalidText' | transloco }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            @if (!auth.isAuthenticated()) {
              <a routerLink="/login" class="btn-primary">{{ 'verifyEmail.signIn' | transloco }}</a>
            }
            <a routerLink="/" class="btn-secondary">{{ 'notFound.home' | transloco }}</a>
          </div>
        }
        @case ('failed') {
          <h1 class="text-xl font-semibold text-shade-900">
            {{ 'verifyEmail.failedTitle' | transloco }}
          </h1>
          <p role="alert" class="mt-2 text-shade-600">{{ errorKey() | transloco }}</p>
        }
      }
    </div>
  `,
})
export class VerifyEmail implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from ?token= (withComponentInputBinding). */
  readonly token = input(undefined, { transform: firstQueryParam });

  protected readonly state = signal<VerifyState>('verifying');
  protected readonly errorKey = signal('errors.unexpected');

  constructor() {
    // A one-time link: nothing for search engines
    const meta = inject(Meta);
    meta.addTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
  }

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.state.set('invalid');
      return;
    }
    // The secret out of the address bar and the history
    void this.router.navigate([], { queryParams: { token: null }, replaceUrl: true });
    this.auth.verifyEmail(token).subscribe({
      next: () => this.state.set('done'),
      error: (err: HttpErrorResponse) => {
        if (problemCode(err) === 'invalid_token') {
          this.state.set('invalid');
        } else {
          this.errorKey.set(httpErrorKey(err));
          this.state.set('failed');
        }
      },
    });
  }
}
