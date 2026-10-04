import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Collection } from '../../core/collections/collection.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { pressEscape, stubModalDialogs } from '../../shared/testing/dialogs';
import { CollectionDeleteDialog } from './collection-delete-dialog';

function collection(id: number, name: string, coinCount = 0): Collection {
  return {
    id,
    name,
    description: null,
    visibility: 'Private',
    coinCount,
    coverImageId: null,
    moderationLocked: false,
    shareToken: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
    updatedAtUtc: '2026-01-01T00:00:00Z',
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
  const submit = () =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent!.trim() === 'Koleksiyonu sil',
    )!;
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
