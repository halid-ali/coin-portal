import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoinPhoto, Denomination } from '../../core/coins/coin.models';
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
      [photos]="photos()"
      [denomination]="denomination()"
      [description]="description()"
      title="2 € Almanya 2006"
      shareToken="abc"
      (closed)="open.set(false)"
    />
  }`,
})
class Host {
  readonly open = signal(true);
  readonly photos = signal(PHOTOS);
  readonly denomination = signal<Denomination | undefined>('Euro2');
  readonly description = signal<string | null>(null);
}

/** An other coin: front and back, no denomination to stand in for a missing back. */
@Component({
  imports: [PhotoViewer],
  template: `<app-photo-viewer
    [coinId]="8"
    [photos]="photos()"
    kind="Other"
    [denomination]="null"
    title="25 kuruş Türkiye 1975"
  />`,
})
class OtherCoinHost {
  readonly photos = signal(PHOTOS);
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
  /** The viewer's content: as wide as the photo (and the text beside it). */
  const content = () => dialog().querySelector<HTMLElement>('.w-full')!;
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

  describe('with a description', () => {
    const TEXT = 'Babamın hatırası.\nKenarında bir çentik var.';
    const region = () => page.querySelector<HTMLElement>('[role=region]');

    beforeEach(async () => {
      fixture.componentInstance.description.set(TEXT);
      await fixture.whenStable();
    });

    it('shows a short one with its line breaks under the photo, in a region of its own', () => {
      expect(region()!.getAttribute('aria-label')).toBe('Açıklama');
      expect(region()!.textContent).toBe(TEXT);
      // Focusable: the keyboard scrolls a long one
      expect(region()!.tabIndex).toBe(0);
      expect(content().className).toContain('48rem');
      // The photo leaves room for it
      expect(page.querySelector('img')!.className).toContain('max-w-[calc(100dvh-14.5rem)]');
    });

    it('puts one over 200 characters or 3 lines beside the photo, the viewer wider', async () => {
      const wider = () => (content().className.includes('72rem') ? content() : null);
      fixture.componentInstance.description.set('a'.repeat(200));
      await fixture.whenStable();
      expect(wider()).toBeNull();

      fixture.componentInstance.description.set('a'.repeat(201));
      await fixture.whenStable();
      expect(wider()).not.toBeNull();
      expect(region()!.className).toContain('lg:overflow-y-auto');
      expect(page.querySelector('img')!.className).toContain('max-w-[calc(100dvh-9rem)]');

      fixture.componentInstance.description.set('1\n2\n3\n4');
      await fixture.whenStable();
      expect(wider()).not.toBeNull();
    });

    it('lets the wheel scroll the text instead of switching the sides', async () => {
      const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
      Object.defineProperty(event, 'timeStamp', { value: (time += 1000) });
      region()!.dispatchEvent(event);
      await fixture.whenStable();

      expect(event.defaultPrevented).toBe(false);
      expect(shown()).toBe('Ulusal yüz');
      // Over the photo it still switches
      await wheel(100);
      expect(shown()).toBe('Ortak yüz');
    });
  });

  it('has no description region without one', () => {
    expect(page.querySelector('[role=region]')).toBeNull();
    expect(content().className).toContain('min(48rem,calc(100dvh-9rem))');
  });

  describe('without a common side photo', () => {
    const national = PHOTOS.filter((p) => p.side === 'National');
    const icon = () => page.querySelector('[role=img]');

    it('shows the denomination icon in its place', async () => {
      fixture.componentInstance.photos.set(national);
      await fixture.whenStable();
      expect(shown()).toBe('Ulusal yüz');
      expect(icon()).toBeNull();

      await key('ArrowRight');
      expect(shown()).toBe('Ortak yüz');
      expect(page.querySelector('img')).toBeNull();
      expect(icon()!.getAttribute('aria-label')).toBe(
        '2 € Almanya 2006 – Ortak yüz (fotoğraf yok)',
      );
      expect(icon()!.querySelector('text')!.textContent).toBe('2€');

      await wheel(-100);
      expect(shown()).toBe('Ulusal yüz');
      expect(imageUrl()).toContain('00000000-0000-0000-0000-000000000001');
    });

    it('shows only the photo when the denomination is not given', async () => {
      fixture.componentInstance.photos.set(national);
      fixture.componentInstance.denomination.set(undefined);
      await fixture.whenStable();

      expect(page.querySelector('[role=group]')).toBeNull();
      expect(icon()).toBeNull();
      await key('ArrowRight');
      expect(imageUrl()).toContain('00000000-0000-0000-0000-000000000001');
    });
  });

  it('reports closing, also by the close button', async () => {
    page.querySelector<HTMLButtonElement>('button[aria-label="Kapat"]')!.click();
    await fixture.whenStable();

    expect(page.querySelector('dialog')).toBeNull();
  });

  it('closes on a click on the dimmed screen, not on the photo', async () => {
    const press = async (target: Element) => {
      target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      (target as HTMLElement).click();
      await fixture.whenStable();
    };

    await press(page.querySelector('img')!);
    expect(page.querySelector('dialog')).not.toBeNull();

    // The screen around the content: the dialog itself is drawn dimmed (axe sees no ::backdrop)
    await press(dialog().firstElementChild!);
    expect(page.querySelector('dialog')).toBeNull();
  });

  describe('an other coin', () => {
    it('names its sides front and back', async () => {
      const other = TestBed.createComponent(OtherCoinHost);
      await other.whenStable();
      const element = other.nativeElement as HTMLElement;
      const labels = [...element.querySelectorAll('[role=group] button')].map((b) =>
        b.textContent!.trim(),
      );

      expect(labels).toEqual(['Ön yüz', 'Arka yüz']);
      expect(element.querySelector('img')!.getAttribute('alt')).toBe(
        '25 kuruş Türkiye 1975 – Ön yüz',
      );
    });

    it('shows only the front when the back has no photo', async () => {
      const other = TestBed.createComponent(OtherCoinHost);
      other.componentInstance.photos.set(PHOTOS.filter((p) => p.side === 'National'));
      await other.whenStable();
      const element = other.nativeElement as HTMLElement;

      expect(element.querySelector('[role=group]')).toBeNull();
      expect(element.querySelector('[role=img]')).toBeNull();
    });
  });
});
