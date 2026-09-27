import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

// Placeholder for the protected area; replaced once the Coin CRUD step lands
@Component({
  selector: 'app-collection',
  template: `
    <section class="card mx-auto max-w-2xl">
      <h1 class="text-2xl font-semibold text-slate-900">Koleksiyonum</h1>
      <p class="mt-2 text-slate-600">
        {{ auth.currentUser()?.userName }}, coin ekleme ve listeleme bir sonraki adımda burada olacak.
      </p>
    </section>
  `,
})
export class Collection {
  protected readonly auth = inject(AuthService);
}