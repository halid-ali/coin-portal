import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { UserResponse } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

/** Main navigation; public items are shown signed out too. */
const NAV_ITEMS: readonly { path: string; label: string; icon: string; public?: boolean }[] = [
  { path: '/collections', label: 'Koleksiyonlarım', icon: 'collections' },
  { path: '/explore', label: 'Keşfet', icon: 'explore', public: true },
];

@Component({
  selector: 'app-header',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  host: {
    // Clicks inside the account menu stop propagation, so any document click closes it
    '(document:click)': 'userMenuOpen.set(false)',
    '(document:keydown.escape)': 'closeMenus()',
  },
})
export class Header {
  protected readonly auth = inject(AuthService);
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
    return (letters || user.userName.charAt(0)).toLocaleUpperCase('tr');
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
