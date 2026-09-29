import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter } from 'rxjs';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

/** Main navigation; public items are shown signed out too. Labels are translation keys. */
const NAV_ITEMS: readonly { path: string; labelKey: string; icon: string; public?: boolean }[] = [
  { path: '/collections', labelKey: 'nav.collections', icon: 'collections' },
  { path: '/explore', labelKey: 'nav.explore', icon: 'explore', public: true },
];

@Component({
  selector: 'app-header',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, TranslocoPipe, ThemeToggle],
  templateUrl: './header.html',
  host: {
    // Sticky here, not on <header>: a sticky element cannot leave its parent, and this host is
    // exactly as tall as the header. Phones: not sticky, so it does not take screen space
    class: 'z-30 block sm:sticky sm:top-0',
    // Clicks inside the account menu stop propagation, so any document click closes it
    '(document:click)': 'userMenuOpen.set(false)',
    '(document:keydown.escape)': 'closeMenus()',
  },
})
export class Header {
  protected readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter((item) => item.public || !!this.auth.currentUser()),
  );
  protected readonly menuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly loggingOut = signal(false);

  constructor() {
    // Any navigation (including back/forward) closes the menus
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenus());
  }

  protected initials(user: UserResponse): string {
    const letters = [user.firstName, user.lastName].map((n) => n.trim().charAt(0)).join('');
    return (letters || user.userName.charAt(0)).toLocaleUpperCase(this.language.current());
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected closeMenus(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        this.closeMenus();
        this.router.navigateByUrl('/');
      },
      error: () => this.loggingOut.set(false),
    });
  }
}
