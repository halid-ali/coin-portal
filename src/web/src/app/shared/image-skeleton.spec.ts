import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ImageSkeleton } from './image-skeleton';

@Component({
  imports: [ImageSkeleton],
  template: `<img appImageSkeleton [src]="url()" alt="" class="rounded-full" />`,
})
class Host {
  readonly url = signal('/api/coins/1/photos/national/thumb?v=a');
}

describe('ImageSkeleton', () => {
  async function create() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const img = (fixture.nativeElement as HTMLElement).querySelector('img')!;
    return { fixture, img };
  }

  it('shows the shape until the photo arrives, keeping its own classes', async () => {
    const { fixture, img } = await create();

    expect(img.getAttribute('src')).toBe('/api/coins/1/photos/national/thumb?v=a');
    expect(img.classList).toContain('skeleton');
    expect(img.classList).toContain('rounded-full');

    img.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    expect(img.classList).not.toContain('skeleton');
    expect(img.classList).toContain('rounded-full');
  });

  it('drops the shape when the photo fails', async () => {
    const { fixture, img } = await create();

    img.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(img.classList).not.toContain('skeleton');
  });

  it('shows the shape again for another address', async () => {
    const { fixture, img } = await create();
    img.dispatchEvent(new Event('load'));
    await fixture.whenStable();

    fixture.componentInstance.url.set('/api/coins/1/photos/common/thumb?v=b');
    await fixture.whenStable();

    expect(img.getAttribute('src')).toBe('/api/coins/1/photos/common/thumb?v=b');
    expect(img.classList).toContain('skeleton');
  });

  it('shows no shape for a photo the browser already has', async () => {
    // jsdom loads no images: one that is complete, as from the cache
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(240);
    try {
      const { img } = await create();
      expect(img.classList).not.toContain('skeleton');
    } finally {
      complete.mockRestore();
      width.mockRestore();
    }
  });
});
