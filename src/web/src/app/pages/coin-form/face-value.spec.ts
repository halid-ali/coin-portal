import { FormControl } from '@angular/forms';

import { faceValueInput, faceValueValidator, parseFaceValue } from './face-value';

describe('face value', () => {
  it('reads a decimal comma or point, nothing else', () => {
    expect(parseFaceValue('25')).toBe(25);
    expect(parseFaceValue(' 0,5 ')).toBe(0.5);
    expect(parseFaceValue('0.25')).toBe(0.25);
    expect(parseFaceValue('1.000,5')).toBeNull();
    expect(parseFaceValue('½')).toBeNull();
    expect(parseFaceValue('-1')).toBeNull();
    expect(parseFaceValue('')).toBeNull();
  });

  it('takes a value above zero with up to four decimals, up to the API limit', () => {
    const errors = (value: string) => faceValueValidator(new FormControl(value));
    expect(errors('')).toBeNull();
    expect(errors('0,0001')).toBeNull();
    expect(errors('1000000000000')).toBeNull();
    expect(errors('0')).toEqual({ faceValue: true });
    expect(errors('0,00001')).toEqual({ faceValue: true });
    expect(errors('1000000000001')).toEqual({ faceValue: true });
    expect(errors('yirmi')).toEqual({ faceValue: true });
  });

  it("shows a stored value with the language's decimal separator, without grouping", () => {
    expect(faceValueInput(0.5, 'tr')).toBe('0,5');
    expect(faceValueInput(0.5, 'en')).toBe('0.5');
    expect(faceValueInput(500000, 'de')).toBe('500000');
  });
});
