import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../Services/AuthService';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';
import { I18nService } from '../../../Core/Services/i18n.service';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { Toast } from '../../../Shared/Toasts/toast';
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
  private readonly i18n = inject(I18nService);

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

  text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.text(key, params);
  }

  private getLocalizedLoginError(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 0) return this.text('ownerLogin.networkError');
    if (status === 401) return this.text('ownerLogin.invalidCredentials');
    if (status === 403) return this.text('ownerLogin.notAuthorized');
    if (status >= 500) return this.text('ownerLogin.serverError');
    if (status >= 400) return this.text('ownerLogin.invalidRequest');
    return this.text('ownerLogin.unexpectedError');
  }

  getErrorMessage(control: AbstractControl | null): string | null {
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;

    if (control.errors['server']) return control.errors['server'];
    if (control.errors['required']) return this.text('common.required');
    if (control.errors['email']) return this.text('auth.invalidEmail');
    if (control.errors['minlength']) {
      return this.text('auth.passwordMin', { count: control.errors['minlength'].requiredLength });
    }
    if (control.errors['missingUppercase']) return this.text('auth.passwordUpper');
    if (control.errors['missingLowercase']) return this.text('auth.passwordLower');
    if (control.errors['missingDigit']) return this.text('auth.passwordDigit');
    if (control.errors['missingSpecialChar']) return this.text('auth.passwordSpecial');
    return this.text('common.invalid');
  }

  onSubmit(): void {
    if (this.loading()) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.formError.set(this.text('auth.fixFields'));
      return;
    }

    this.loading.set(true);
    this.formError.set(null);

    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: (response: any) => {
        const token = response?.data?.accessToken ?? response?.token;
        if (!token) {
          this.loading.set(false);
          this.formError.set(this.text('auth.loginResponseError'));
          return;
        }

        this.authSession.setToken(token);
        const user = this.authSession.user();

        if (user?.role?.trim().toLowerCase() !== 'owner') {
          this.authSession.clearToken();
          this.loading.set(false);
          this.formError.set(this.text('ownerLogin.ownerOnly'));
          return;
        }

        this.loading.set(false);
        this.toast.show(this.text('ownerLogin.welcome'), 'success');
        this.router.navigate(['/owner-dashboard']);
      },
      error: (error) => {
        this.loading.set(false);
        const message = this.getLocalizedLoginError(error);
        this.formError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }
}
