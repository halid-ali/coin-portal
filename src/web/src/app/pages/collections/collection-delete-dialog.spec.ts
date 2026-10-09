import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Collection } from '../../core/collections/collection.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { pressEscape, stubModalDialogs } from '../../shared/testing/dialogs';
import { CollectionDeleteDialog } from './collection-delete-dialog';

function collection(
  id: number,
  name: string,
  coinCount = 0,
  more: Partial<Collection> = {},
): Collection {
  return {
    id,
    name,
    description: null,
    visibility: 'Private',
    coinCount,
    photographedCoinCount: coinCount,
    minPublicCoins: 10,
    canBePublic: false,
    coverImageId: null,
    moderationLocked: false,
    shareToken: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
    updatedAtUtc: '2026-01-01T00:00:00Z',
    ...more,
  };
}

@Component({
  imports: [CollectionDeleteDialog],
  template: `@if (open()) {
    <app-collection-delete-dialog
      [collection]="doomed()"
      [collections]="all()"
      (closed)="results.push($event); open.set(false)"
    />
  }`,
})
class Host {
  readonly open = signal(true);
  readonly doomed = signal(collection(5, 'Hatıra paraları', 2));
  readonly all = signal([collection(4, 'Koleksiyonum'), collection(5, 'Hatıra paraları', 2)]);
  readonly results: boolean[] = [];
}

describe('CollectionDeleteDialog', () => {
  let fixture: ComponentFixture<Host>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    await useTestLanguage('tr');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  const dialog = () => page.querySelector('dialog');
  const button = (text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent!.trim() === text,
    )!;
  const submit = () => button('Koleksiyonu sil');
  async function type(name: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>('input[type=text]')!;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('deletes only when the name is typed exactly, moving the coins by default', async () => {
    await type('hatıra paraları');
    expect(submit().disabled).toBe(true);

    await type('  Hatıra paraları ');
    expect(submit().disabled).toBe(false);
    submit().click();

    // The other collection is the target
    const request = http.expectOne('/api/collections/5?moveTo=4');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(fixture.componentInstance.results).toEqual([true]);
  });

  it('warns when coins without photos would go into a public collection, and confirms it', async () => {
    fixture.componentInstance.all.set([
      collection(4, 'Vitrin', 12, { visibility: 'Public' }),
      collection(5, 'Hatıra paraları', 2),
    ]);
    fixture.componentInstance.doomed.set(
      collection(5, 'Hatıra paraları', 2, { photographedCoinCount: 1 }),
    );
    await fixture.whenStable();

    expect(page.textContent).toContain(
      '"Vitrin" herkese açık ve bu koleksiyonda fotoğrafı eksik 1 coin var',
    );
    await type('Hatıra paraları');
    submit().click();

    http
      .expectOne('/api/collections/5?moveTo=4&unpublish=true')
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(fixture.componentInstance.results).toEqual([true]);
  });

  it('shows the warning when the API says so, and the next click confirms it', async () => {
    await type('Hatıra paraları');
    expect(page.textContent).not.toContain('herkese açık ve bu koleksiyonda');
    submit().click();

    // This page's counts were old: the target is public now
    http
      .expectOne('/api/collections/5?moveTo=4')
      .flush(
        { code: 'would_unpublish', collections: [{ id: 4, name: 'Koleksiyonum' }] },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(fixture.componentInstance.results).toEqual([]);
    // Announced, with no count (this page did not know of any coin without photos)
    expect(page.querySelector('[role=alert]')!.textContent).toContain(
      '"Koleksiyonum" herkese açık ve taşınacak coin\'lerin bazılarının fotoğrafı eksik',
    );
    expect(submit()).toBeUndefined();

    button('Yine de sil').click();
    http
      .expectOne('/api/collections/5?moveTo=4&unpublish=true')
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(fixture.componentInstance.results).toEqual([true]);
  });

  it('forgets what the API said when another target is chosen', async () => {
    fixture.componentInstance.all.set([
      collection(4, 'Koleksiyonum'),
      collection(5, 'Hatıra paraları', 2),
      collection(6, 'Yedek'),
    ]);
    await fixture.whenStable();
    await type('Hatıra paraları');
    submit().click();
    http
      .expectOne('/api/collections/5?moveTo=4')
      .flush(
        { code: 'would_unpublish', collections: [{ id: 4, name: 'Koleksiyonum' }] },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(page.textContent).toContain('"Koleksiyonum" herkese açık');

    const select = page.querySelector<HTMLSelectElement>('select')!;
    select.value = '6';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(page.textContent).not.toContain('herkese açık ve');
    submit().click();
    http
      .expectOne('/api/collections/5?moveTo=6')
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(fixture.componentInstance.results).toEqual([true]);
  });

  it('closes on Escape without deleting', async () => {
    pressEscape(dialog()!);
    await fixture.whenStable();

    expect(fixture.componentInstance.results).toEqual([false]);
    expect(dialog()).toBeNull();
  });

  it('stays open on Escape while deleting', async () => {
    await type('Hatıra paraları');
    submit().click();
    const request = http.expectOne('/api/collections/5?moveTo=4');

    pressEscape(dialog()!);

    expect(dialog()!.open).toBe(true);
    expect(fixture.componentInstance.results).toEqual([]);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(fixture.componentInstance.results).toEqual([true]);
  });
});
