import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');
  private readonly http = inject(HttpClient);

  // Temporary: shows whether the API is reachable through the dev proxy
  protected readonly apiStatus = signal('checking...');

  constructor() {
    this.http
      .get<{ status: string; serverTimeUtc: string }>('/api/health')
      .subscribe({
        next: (r) => this.apiStatus.set(`${r.status} (${r.serverTimeUtc})`),
        error: () => this.apiStatus.set('unreachable'),
      });
  }
}
