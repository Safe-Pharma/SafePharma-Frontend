import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../Services/AuthService';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { Toast } from '../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { passwordComplexityValidator } from '../../subscribe/Validators/custom-validators';

@Component({
  selector: 'app-owner-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './owner-login.html',
})
export class OwnerLogin {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  readonly loading = signal(false);
  readonly formError = signal<string | null>(null);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), passwordComplexityValidator]],
  });

  get email() {
    return this.loginForm.get('email')!;
  }

  get password() {
    return this.loginForm.get('password')!;
  }

  getErrorMessage(control: AbstractControl | null): string | null {
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;

    if (control.errors['server']) return control.errors['server'];
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Please enter a valid email address.';
    if (control.errors['minlength']) return 'Password must be at least 8 characters.';
    return 'Invalid value.';
  }

  onSubmit(): void {
    if (this.loading()) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.formError.set('Please fix the highlighted fields before signing in.');
      return;
    }

    this.loading.set(true);
    this.formError.set(null);

    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: (response: any) => {
        const token = response?.data?.accessToken ?? response?.token;
        if (!token) {
          this.loading.set(false);
          this.formError.set('The login response did not include an access token.');
          return;
        }

        this.authSession.setToken(token);
        const user = this.authSession.user();

        if (user?.role !== 'Owner') {
          this.authSession.clearToken();
          this.loading.set(false);
          this.formError.set('This login is only available to Owner accounts.');
          return;
        }

        this.loading.set(false);
        this.toast.show('Welcome back, Owner.', 'success');
        this.router.navigate(['/owner-dashboard']);
      },
      error: (error) => {
        this.loading.set(false);
        const message = getErrorMessage(error, 'Unable to sign in. Please try again.');
        this.formError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }
}
