import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { provideTestTransloco } from '../i18n/testing';
import { UserResponse } from './auth.models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const user: UserResponse = {
  id: '1',
  userName: 'alice',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  birthDate: '1990-01-01',
  language: null,
  theme: null,
  accent: null,
  previousSignInAtUtc: null,
  emailConfirmed: true,
  roles: [],
};

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([authInterceptor]),
          withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
        ),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTestTransloco(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    document.cookie = 'XSRF-TOKEN=old-token';
  });

  afterEach(() => http.verify());

  /** Starts a request; settles with its result or error. */
  function send(request: Promise<unknown>) {
    let outcome: unknown = 'pending';
    request.then(
      (value) => (outcome = value),
      (err: unknown) => (outcome = err),
    );
    return () => outcome;
  }

  async function flushed(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
  }

  it('fetches a new antiforgery token after a rejection and sends the request again', async () => {
    const outcome = send(firstValueFrom(client.post('/api/coins', { title: 'x' })));

    const first = http.expectOne('/api/coins');
    expect(first.request.headers.get('X-XSRF-TOKEN')).toBe('old-token');
    first.flush(null, { status: 400, statusText: 'Bad Request' });

    // The API sets the cookie with the token answer
    const refresh = http.expectOne('/api/auth/antiforgery');
    document.cookie = 'XSRF-TOKEN=new-token';
    refresh.flush(null);

    const retry = http.expectOne('/api/coins');
    expect(retry.request.method).toBe('POST');
    expect(retry.request.headers.get('X-XSRF-TOKEN')).toBe('new-token');
    retry.flush({ id: 7 });
    await flushed();
    expect(outcome()).toEqual({ id: 7 });
  });

  it('retries only once', async () => {
    const outcome = send(firstValueFrom(client.delete('/api/coins/7')));
    http.expectOne('/api/coins/7').flush(null, { status: 400, statusText: 'Bad Request' });
    http.expectOne('/api/auth/antiforgery').flush(null);
    http.expectOne('/api/coins/7').flush(null, { status: 400, statusText: 'Bad Request' });
    await flushed();

    expect((outcome() as HttpErrorResponse).status).toBe(400);
  });

  it('reports the rejection when the token cannot be fetched either', async () => {
    const outcome = send(firstValueFrom(client.post('/api/coins', {})));
    http.expectOne('/api/coins').flush(null, { status: 400, statusText: 'Bad Request' });
    http.expectOne('/api/auth/antiforgery').flush(null, { status: 0, statusText: 'Unknown' });
    await flushed();

    const error = outcome() as HttpErrorResponse;
    expect(error.status).toBe(400);
    expect(error.url).toBe('/api/coins');
  });

  it('does not retry validation errors, coded problems or reads', async () => {
    const validation = send(firstValueFrom(client.post('/api/coins', {})));
    http
      .expectOne('/api/coins')
      .flush({ errors: { Title: ['Required'] } }, { status: 400, statusText: 'Bad Request' });

    const coded = send(firstValueFrom(client.post('/api/collections', {})));
    http
      .expectOne('/api/collections')
      .flush({ code: 'collection_limit' }, { status: 400, statusText: 'Bad Request' });

    const read = send(firstValueFrom(client.get('/api/coins')));
    http.expectOne('/api/coins').flush(null, { status: 400, statusText: 'Bad Request' });
    await flushed();

    for (const outcome of [validation, coded, read]) {
      expect((outcome() as HttpErrorResponse).status).toBe(400);
    }
    http.expectNone('/api/auth/antiforgery');
  });

  it('signs out without sending to the sign-in page when the session was already over', async () => {
    const auth = TestBed.inject(AuthService);
    const signedIn = firstValueFrom(
      auth.login({ userNameOrEmail: 'alice', password: 'x', rememberMe: true }),
    );
    http.expectOne('/api/auth/login').flush(user);
    http.expectOne('/api/auth/antiforgery').flush(null);
    await signedIn;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    const outcome = send(firstValueFrom(auth.logout(), { defaultValue: 'done' }));
    http.expectOne('/api/auth/logout').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/antiforgery').flush(null);
    await flushed();

    expect(outcome()).not.toBeInstanceOf(HttpErrorResponse);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends a signed-in user to sign in when the session ends', async () => {
    const auth = TestBed.inject(AuthService);
    const signedIn = firstValueFrom(
      auth.login({ userNameOrEmail: 'alice', password: 'x', rememberMe: true }),
    );
    http.expectOne('/api/auth/login').flush(user);
    http.expectOne('/api/auth/antiforgery').flush(null);
    await signedIn;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    send(firstValueFrom(client.get('/api/collections')));
    http.expectOne('/api/collections').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/antiforgery').flush(null);
    await flushed();

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });
});
