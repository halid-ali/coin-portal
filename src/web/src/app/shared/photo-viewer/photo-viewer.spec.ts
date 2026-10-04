import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoinPhoto } from '../../core/coins/coin.models';
import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { stubModalDialogs } from '../testing/dialogs';
import { PhotoViewer } from './photo-viewer';

const PHOTOS: CoinPhoto[] = [
  { side: 'Common', id: '00000000-0000-0000-0000-000000000002' },
  { side: 'National', id: '00000000-0000-0000-0000-000000000001' },
];

@Component({
  imports: [PhotoViewer],
  template: `@if (open()) {
    <app-photo-viewer
      [coinId]="7"
      [photos]="photos"
      title="2 € Almanya 2006"
      shareToken="abc"
      (closed)="open.set(false)"
    />
  }`,
})
class Host {
  readonly open = signal(true);
  readonly photos = PHOTOS;
}

describe('PhotoViewer', () => {
  let fixture: ComponentFixture<Host>;
  let page: HTMLElement;

  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    page = fixture.nativeElement as HTMLElement;
  });

  const dialog = () => page.querySelector('dialog')!;
  const shown = () => page.querySelector('[aria-pressed=true]')?.textContent?.trim();
  const imageUrl = () => page.querySelector('img')!.getAttribute('src');

  async function key(name: string): Promise<void> {
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    await fixture.whenStable();
  }

  /** One wheel gesture; each call is a new one (its time is far after the last). */
  let time = 0;
  async function wheel(deltaY: number): Promise<void> {
    const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'timeStamp', { value: (time += 1000) });
    dialog().dispatchEvent(event);
    await fixture.whenStable();
  }

  it('opens as a modal on the national side, with the share key in the address', () => {
    expect(dialog().open).toBe(true);
    expect(shown()).toBe('Ulusal yüz');
    expect(imageUrl()).toContain('s=abc');
  });

  it('cycles through the sides with the arrow keys', async () => {
    await key('ArrowRight');
    expect(shown()).toBe('Ortak yüz');
    await key('ArrowRight');
    expect(shown()).toBe('Ulusal yüz');
    await key('ArrowLeft');
    expect(shown()).toBe('Ortak yüz');
  });

  it('moves one side per wheel gesture and stops at the ends', async () => {
    await wheel(100);
    expect(shown()).toBe('Ortak yüz');
    await wheel(100);
    expect(shown()).toBe('Ortak yüz');
    await wheel(-100);
    expect(shown()).toBe('Ulusal yüz');
    await wheel(-100);
    expect(shown()).toBe('Ulusal yüz');
  });

  it('reports closing, also by the close button', async () => {
    page.querySelector<HTMLButtonElement>('button[aria-label="Kapat"]')!.click();
    await fixture.whenStable();

    expect(page.querySelector('dialog')).toBeNull();
  });
});
