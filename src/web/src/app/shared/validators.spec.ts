import { FormControl, FormGroup } from '@angular/forms';

import {
  ageOn,
  integerValidator,
  latestBirthDate,
  minimumAgeValidator,
  notBlankValidator,
  passwordMatchValidator,
} from './validators';

describe('validators', () => {
  const today = new Date(Date.UTC(2026, 8, 27)); // 2026-09-27

  it('ageOn counts full years only', () => {
    expect(ageOn('2008-09-27', today)).toBe(18);
    expect(ageOn('2008-09-28', today)).toBe(17);
  });

  it('uses the UTC date, as the API does', () => {
    // 01:30 on the 28th in Turkey (UTC+3) is still the 27th in UTC
    const turkishNight = new Date('2026-09-27T22:30:00Z');
    expect(ageOn('2008-09-28', turkishNight)).toBe(17);
    expect(latestBirthDate(18, turkishNight)).toBe('2008-09-27');
  });

  it('notBlankValidator treats only spaces as missing', () => {
    expect(notBlankValidator(new FormControl('   '))).toEqual({ required: true });
    expect(notBlankValidator(new FormControl(' Ali '))).toBeNull();
    expect(notBlankValidator(new FormControl(''))).toBeNull();
  });

  it('integerValidator rejects fractions', () => {
    expect(integerValidator(new FormControl(2006.5))?.['integer']).toBe(true);
    expect(integerValidator(new FormControl(2006))).toBeNull();
    expect(integerValidator(new FormControl(null))).toBeNull();
  });

  it('minimumAgeValidator rejects under-age and future dates', () => {
    const validator = minimumAgeValidator(18);
    expect(validator(new FormControl('1990-01-01'))).toBeNull();
    expect(validator(new FormControl('2020-01-01'))?.['minAge']).toBeTruthy();
    expect(validator(new FormControl('2999-01-01'))?.['futureDate']).toBe(true);
  });

  it('passwordMatchValidator flags the confirm control', () => {
    const group = new FormGroup(
      { password: new FormControl('Secret123'), confirm: new FormControl('Other123') },
      { validators: passwordMatchValidator('password', 'confirm') },
    );
    expect(group.controls.confirm.hasError('passwordMismatch')).toBe(true);

    group.controls.confirm.setValue('Secret123');
    expect(group.controls.confirm.errors).toBeNull();
  });
});
