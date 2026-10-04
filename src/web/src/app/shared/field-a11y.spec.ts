import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { provideTestTransloco, useTestLanguage } from '../core/i18n/testing';
import { FieldA11y } from './field-a11y';

@Component({
  imports: [ReactiveFormsModule, FieldA11y],
  template: `
    <form [formGroup]="form">
      <input id="name" formControlName="name" appField />
      <input id="note" formControlName="note" appField />
    </form>
    <select id="loose" [appField]="loose"></select>
  `,
})
class Host {
  readonly form = new FormGroup({
    name: new FormControl('', Validators.required),
    note: new FormControl(''),
  });
  readonly loose = new FormControl<number | null>(null, Validators.required);
}

describe('FieldA11y', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  it('ties the field to its texts and says when it is required or invalid', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const name = page.querySelector('#name')!;
    const note = page.querySelector('#note')!;

    expect(name.getAttribute('aria-describedby')).toBe('name-error name-hint');
    expect(name.getAttribute('aria-required')).toBe('true');
    expect(note.hasAttribute('aria-required')).toBe(false);
    // Not before the error is shown
    expect(name.hasAttribute('aria-invalid')).toBe(false);

    fixture.componentInstance.form.markAllAsTouched();
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(note.hasAttribute('aria-invalid')).toBe(false);
  });

  it('takes the control of a field without a form directive', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const loose = (fixture.nativeElement as HTMLElement).querySelector('#loose')!;
    expect(loose.getAttribute('aria-required')).toBe('true');

    fixture.componentInstance.loose.markAsTouched();
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(loose.getAttribute('aria-invalid')).toBe('true');
  });
});
