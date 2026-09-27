import { AbstractControl } from '@angular/forms';

/** Turns the first validation error of a control into a user-facing (Turkish) message. */
export function errorMessage(control: AbstractControl | null): string | null {
  if (!control?.errors || !(control.touched || control.dirty)) {
    return null;
  }
  const e = control.errors;

  if (e['server']) return e['server'] as string;
  if (e['required']) return 'Bu alan zorunludur.';
  if (e['email']) return 'Geçerli bir e-posta adresi girin.';
  if (e['minlength']) return `En az ${e['minlength'].requiredLength} karakter olmalı.`;
  if (e['maxlength']) return `En fazla ${e['maxlength'].requiredLength} karakter olabilir.`;
  if (e['pattern']) return 'Sadece harf, rakam ve . _ - kullanılabilir.';
  if (e['minAge']) return `Kayıt için en az ${e['minAge'].required} yaşında olmalısın.`;
  if (e['futureDate']) return 'Doğum tarihi gelecekte olamaz.';
  if (e['maxAge']) return 'Geçerli bir doğum tarihi girin.';
  if (e['passwordStrength']) return 'Parola en az bir büyük harf, bir küçük harf ve bir rakam içermeli.';
  if (e['passwordMismatch']) return 'Parolalar eşleşmiyor.';

  return 'Geçersiz değer.';
}