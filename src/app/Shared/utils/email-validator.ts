import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/**
 * Validates an email address and requires a dotted domain (for example,
 * `user@example.com`). Angular's built-in email validator accepts addresses
 * such as `user@example`, which are not valid for this application's login.
 */
export function emailWithDomainValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;

  if (Validators.email(control)) return { email: true };

  const domain = value.slice(value.lastIndexOf('@') + 1);
  const hasDottedDomain = /^(?:[^.\s@]+\.)+[^.\s@]+$/.test(domain);

  return hasDottedDomain ? null : { emailDomain: true };
}
