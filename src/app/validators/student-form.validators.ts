import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * First/last name: ASCII letters (A–Z, a–z) only, no spaces or symbols.
 * Pair with {@link Validators.minLength}(5) and {@link Validators.maxLength}(20).
 * Empty value is left to {@link Validators.required}.
 */
export function nameLettersOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) {
      return null;
    }
    const s = String(raw);
    if (s === '') {
      return null;
    }
    if (!/^[a-zA-Z]+$/.test(s)) {
      return { nameLettersOnly: true };
    }
    return null;
  };
}

/**
 * Roll number: digits only, then integer 1–100 with no leading zero (e.g. 5 ok, 05 invalid).
 */
export function rollNoSchoolValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) {
      return null;
    }
    const s = String(raw).trim();
    if (s === '') {
      return null;
    }
    if (!/^\d+$/.test(s)) {
      return { rollNoDigitsOnly: true };
    }
    if (!/^(?:[1-9]\d?|100)$/.test(s)) {
      return { rollNoInvalid: true };
    }
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { rollNoInvalid: true };
    }
    return null;
  };
}
