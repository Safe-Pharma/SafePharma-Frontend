import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../Services/AuthService';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { Toast } from '../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { passwordComplexityValidator } from '../../subscribe/Validators/custom-validators';

function matchValidator(group: AbstractControl) {
  const newPass = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return newPass === confirm ? null : { notMatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(Toast);

  loading = signal(false);
  formError = signal<string | null>(null);

  form = this.fb.group(
    {
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8), passwordComplexityValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchValidator }
  );

  get oldPassword() {
    return this.form.get('oldPassword')!;
  }
  get newPassword() {
    return this.form.get('newPassword')!;
  }
  get confirmPassword() {
    return this.form.get('confirmPassword')!;
  }

  getErrorMessage(control: AbstractControl | null): string | null {
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;

    const errors = control.errors;
    if (errors['server']) return errors['server'];
    if (errors['required']) return 'This field is required.';
    if (errors['minlength']) return `Must be at least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength']) return `Must not exceed ${errors['maxlength'].requiredLength} characters.`;
    if (errors['missingUppercase']) return 'Password must contain at least one uppercase letter.';
    if (errors['missingLowercase']) return 'Password must contain at least one lowercase letter.';
    if (errors['missingDigit']) return 'Password must contain at least one number.';
    if (errors['missingSpecialChar']) return 'Password must contain at least one special character.';
    if (errors['pattern']) return 'Invalid format.';
    return 'Invalid value.';
  }

  onSubmit() {
    if (this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const message = 'Please fix the highlighted fields before updating your password.';
      this.formError.set(message);
      this.toast.show(message, 'error');
      return;
    }

    this.loading.set(true);
    this.formError.set(null);

    const { oldPassword, newPassword } = this.form.getRawValue();

    this.auth.changePassword({ currentPassword: oldPassword, newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('Password changed successfully.', 'success');
        this.form.reset();
      },
      error: (err) => {
        this.loading.set(false);
        const message = getErrorMessage(err, 'Unable to change password. Please try again.');
        this.formError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }
}