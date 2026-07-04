import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;

  const errors: ValidationErrors = {};
  if (!/[A-Z]/.test(value)) errors['missingUppercase'] = true;
  if (!/[a-z]/.test(value)) errors['missingLowercase'] = true;
  if (!/[0-9]/.test(value)) errors['missingDigit'] = true;
  if (!/[^a-zA-Z0-9]/.test(value)) errors['missingSpecialChar'] = true;

  return Object.keys(errors).length > 0 ? errors : null;
}

export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;

  const digitsOnly = value.replace(/[^\d+]/g, '');
  const valid = /^\+[1-9]\d{7,14}$/.test(digitsOnly);
  return valid ? null : { invalidPhone: true };
}

export function fullNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;

  const valid = /^[a-zA-Z\u0600-\u06FF\s'\-]+$/.test(value);
  return valid ? null : { invalidName: true };
}

export function alphanumericHyphenValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null; // optional field — only validated if something was entered

  const valid = /^[A-Za-z0-9\-]{5,20}$/.test(value);
  return valid ? null : { invalidFormat: true };
}