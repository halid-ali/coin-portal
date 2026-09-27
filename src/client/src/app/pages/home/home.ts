import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-2xl py-8 text-center">
      <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">
        Euro coin koleksiyonun, her yerde yanında
      </h1>

      @if (auth.currentUser(); as user) {
        <p class="mt-4 text-lg text-slate-600">Hoş geldin, {{ user.firstName }}!</p>
        <a routerLink="/collections" class="btn-primary mt-8">Koleksiyonlarıma git</a>
      } @else {
        <p class="mt-4 text-lg text-slate-600">
          Coinlerini fotoğraflarıyla kaydet, elinde olup olmadığını saniyeler içinde kontrol et ve
          koleksiyonunu arkadaşlarınla paylaş.
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a routerLink="/register" class="btn-primary">Ücretsiz kayıt ol</a>
          <a routerLink="/login" class="btn-secondary">Giriş yap</a>
        </div>
      }
    </section>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
}
