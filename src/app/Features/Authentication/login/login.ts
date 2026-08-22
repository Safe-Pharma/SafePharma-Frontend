import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../Services/AuthService';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { Toast } from '../../../Shared/Toasts/toast';
import { passwordComplexityValidator } from '../../subscribe/Validators/custom-validators';
import { Router } from '@angular/router';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';
import { I18nService } from '../../../Core/Services/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Spinner],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(Toast);
  private authSession = inject(AuthSessionService);
  private router = inject(Router);
  private i18n = inject(I18nService);

  loading = signal(false);
  formError = signal<string | null>(null);

  text(key: string, params?: Record<string, string | number>): string { return this.i18n.text(key, params); }

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), passwordComplexityValidator]],
    remember: [true],
  });

  get email() {
    return this.loginForm.get('email')!;
  }
  get password() {
    return this.loginForm.get('password')!;
  }

  getErrorMessage(control: AbstractControl | null): string | null {
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;

    const errors = control.errors;
    if (errors['server']) return errors['server'];
    if (errors['required']) return this.i18n.text('common.required');
    if (errors['email']) return this.i18n.text('auth.invalidEmail');
    if (errors['minlength'])
      return this.i18n.text('auth.passwordMin', { count: errors['minlength'].requiredLength });
    if (errors['maxlength'])
      return `Must not exceed ${errors['maxlength'].requiredLength} characters.`;
    if (errors['missingUppercase']) return this.i18n.text('auth.passwordUpper');
    if (errors['missingLowercase']) return this.i18n.text('auth.passwordLower');
    if (errors['missingDigit']) return this.i18n.text('auth.passwordDigit');
    if (errors['missingSpecialChar'])
      return this.i18n.text('auth.passwordSpecial');
    if (errors['pattern']) return this.i18n.text('common.invalid');
    return this.i18n.text('common.invalid');
  }

  onSubmit() {
    if (this.loading()) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      const message = this.i18n.text('auth.fixFields');
      this.formError.set(message);
      // this.toast.show(message, 'error');
      return;
    }

    this.loading.set(true);
    this.formError.set(null);

    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: (res: any) => {
        const token = res?.data?.accessToken ?? res?.token;
        if (!token) {
          this.loading.set(false);
          this.formError.set(this.i18n.text('auth.loginResponseError'));
          return;
        }

        this.authSession.setToken(token);
        this.i18n.initializeForCurrentSession();
        const user = this.authSession.user();

        if (user?.role.trim().toLowerCase() === 'owner') {
          this.authSession.clearToken();
          this.loading.set(false);
          this.formError.set(this.i18n.text('auth.unableSignIn'));
          return;
        }

        this.loading.set(false);
        this.toast.show(this.i18n.text('auth.welcome'), 'success');
        this.router.navigate(['/app/dashboard'], { replaceUrl: true });
      },
      error: (err) => {
        this.loading.set(false);
        const message = getErrorMessage(err, this.i18n.text('auth.unableSignIn'));
        this.formError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }
}
