import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageCropperComponent } from 'ngx-image-cropper';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { PhotoCropDialog } from './photo-crop-dialog';

describe('PhotoCropDialog', () => {
  beforeEach(async () => {
    // jsdom has no modal dialogs
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
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
});
