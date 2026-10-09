import { AbstractControl, ValidationErrors } from '@angular/forms';

import { COIN_LIMITS } from '../../core/coins/coin.models';

/** Digits with an optional decimal part after a comma or a point; no thousands separators. */
const FACE_VALUE = /^(\d+)(?:[.,](\d+))?$/;

/** "25", "0,5" or "0.5" → the number; null for anything else (empty, "1.000,5", "½"). */
export function parseFaceValue(text: string): number | null {
  const trimmed = text.trim();
  return FACE_VALUE.test(trimmed) ? Number(trimmed.replace(',', '.')) : null;
}

/**
 * An other coin's face value as the API takes it: above 0, at most COIN_LIMITS.maxFaceValue, up
 * to faceValueDecimals decimals. Empty is left to Validators.required.
 */
export function faceValueValidator(control: AbstractControl): ValidationErrors | null {
  const text = String(control.value ?? '').trim();
  if (text === '') {
    return null;
  }
  const match = FACE_VALUE.exec(text);
  const value = parseFaceValue(text);
  const decimals = match?.[2]?.length ?? 0;
  return value === null ||
    value <= 0 ||
    value > COIN_LIMITS.maxFaceValue ||
    decimals > COIN_LIMITS.faceValueDecimals
    ? { faceValue: true }
    : null;
}

/** A stored value for the input, with the language's decimal separator and no grouping: "0,5" (tr). */
export function faceValueInput(value: number, lang: string): string {
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 4, useGrouping: false }).format(
    value,
  );
}
