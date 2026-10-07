import { AfterContentInit, Component, ElementRef, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * A password input with a show/hide button inside it and a "Caps Lock is on" note under it (user
 * decisions 2026-10-07: an eye icon, the note in the hint's gray). The input itself is projected,
 * so formControlName, appField and its id stay where they were:
 *
 *   <app-password-field><input id="password" type="password" … class="form-input" /></app-password-field>
 *
 * Every password field of the site uses it (Edge's own reveal button is hidden in styles.css). The
 * note needs a key press to know: phones' on-screen keyboards do not tell the page.
 */
@Component({
  selector: 'app-password-field',
  imports: [TranslocoPipe],
  host: {
    class: 'block',
    '(keydown)': 'checkCapsLock($event)',
    '(keyup)': 'checkCapsLock($event)',
    '(focusout)': 'capsLock.set(false)',
  },
  template: `
    <div class="relative">
      <ng-content />
      <!-- One name, the state in aria-pressed: "Show password, pressed" -->
      <button
        type="button"
        class="absolute top-1/2 right-1.5 flex -translate-y-1/2 rounded-md p-1.5 text-shade-500
               hover:text-shade-800 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        [attr.aria-label]="'common.showPassword' | transloco"
        [attr.aria-pressed]="shown()"
        [attr.aria-controls]="input()?.id || null"
        (click)="toggle()"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          @if (shown()) {
            <!-- eye, struck through -->
            <path d="M3 3l18 18" />
            <path
              d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"
            />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          } @else {
            <!-- eye -->
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          }
        </svg>
      </button>
    </div>
    <!-- Always in the page, so screen readers announce the note when it appears -->
    <div aria-live="polite">
      @if (capsLock()) {
        <p class="form-hint flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            class="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4 5 11h4v4h6v-4h4z" />
            <path d="M9 19h6" />
          </svg>
          {{ 'common.capsLockOn' | transloco }}
        </p>
      }
    </div>
  `,
})
export class PasswordField implements AfterContentInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly shown = signal(false);
  protected readonly capsLock = signal(false);

  ngAfterContentInit(): void {
    // Room for the button, so a long password does not run under it
    this.input()?.classList.add('pr-11');
  }

  protected toggle(): void {
    const input = this.input();
    if (!input) {
      return;
    }
    this.shown.update((shown) => !shown);
    input.type = this.shown() ? 'text' : 'password';
  }

  protected checkCapsLock(event: KeyboardEvent): void {
    // Keys on the button say nothing about typing; getModifierState is missing on synthetic events
    if (event.target === this.input() && typeof event.getModifierState === 'function') {
      this.capsLock.set(event.getModifierState('CapsLock'));
    }
  }

  /** The projected input; its id may be bound, so it is read when needed. */
  protected input(): HTMLInputElement | null {
    return this.host.nativeElement.querySelector('input');
  }
}
