import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { pressEscape, stubModalDialogs } from '../testing/dialogs';
import { PhotoCropDialog } from './photo-crop-dialog';

describe('PhotoCropDialog', () => {
  beforeEach(async () => {
    stubModalDialogs();
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  // jsdom cannot decode images: the cropper's failure event is raised by hand
  async function failToOpen(file: File): Promise<string> {
    const fixture = TestBed.createComponent(PhotoCropDialog);
    fixture.componentRef.setInput('file', file);
    await fixture.whenStable();
    const cropper = fixture.debugElement.query(By.directive(ImageCropperComponent));
    (cropper.componentInstance as ImageCropperComponent).loadImageFailed.emit();
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('explains that the browser cannot open HEIC photos', async () => {
    const text = await failToOpen(new File([], 'IMG_0001.HEIC', { type: 'image/heic' }));
    expect(text).toContain('HEIC/HEIF biçimindeki fotoğrafları açamıyor');
  });

  it('shows the general message for other files', async () => {
    const text = await failToOpen(new File([], 'broken.jpg', { type: 'image/jpeg' }));
    expect(text).toContain('Fotoğraf açılamadı');
  });

  /** An open dialog whose cropper is ready; `results` collects what it emits on closing. */
  async function openReady() {
    const fixture = TestBed.createComponent(PhotoCropDialog);
    fixture.componentRef.setInput('file', new File([], 'coin.jpg', { type: 'image/jpeg' }));
    const results: (Blob | null)[] = [];
    fixture.componentInstance.closed.subscribe((result) => results.push(result));
    await fixture.whenStable();
    const cropper = fixture.debugElement.query(By.directive(ImageCropperComponent))
      .componentInstance as ImageCropperComponent;
    cropper.cropperReady.emit({ width: 600, height: 600 });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      [...page.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent!.trim() === text,
      )!;
    return { fixture, cropper, results, page, button };
  }

  it('gives the cropped image when used', async () => {
    const { fixture, cropper, results, page, button } = await openReady();
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' });
    vi.spyOn(cropper, 'crop').mockResolvedValue({ blob } as ImageCroppedEvent);

    button('Kullan').click();
    await fixture.whenStable();

    expect(results).toEqual([blob]);
    expect(page.querySelector('dialog')!.open).toBe(false);
  });

  it('gives nothing when cancelled by the button', async () => {
    const { results, button } = await openReady();
    button('Vazgeç').click();
    expect(results).toEqual([null]);
  });

  it('gives nothing when cancelled by Escape', async () => {
    const { results, page } = await openReady();
    pressEscape(page.querySelector('dialog')!);
    expect(results).toEqual([null]);
  });
});
