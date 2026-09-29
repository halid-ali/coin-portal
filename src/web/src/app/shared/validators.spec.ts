import { FormControl, FormGroup } from '@angular/forms';

import { ageOn, minimumAgeValidator, passwordMatchValidator } from './validators';

describe('validators', () => {
  const today = new Date(2026, 8, 27); // 2026-09-27

  it('ageOn counts full years only', () => {
    expect(ageOn('2008-09-27', today)).toBe(18);
    expect(ageOn('2008-09-28', today)).toBe(17);
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
