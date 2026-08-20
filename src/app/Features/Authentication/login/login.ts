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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Spinner],
  templateUrl: './login.html',
  
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(Toast);
  private authSession = inject(AuthSessionService);
  private router = inject(Router);

  loading = signal(false);
  formError = signal<string | null>(null);

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
    if (errors['required']) return 'This field is required.';
    if (errors['email']) return 'Please enter a valid email address.';
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

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      const message = 'Please fix the highlighted fields before signing in.';
      this.formError.set(message);
      // this.toast.show(message, 'error');
      return;
    }

    this.loading.set(true);
    this.formError.set(null);

    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: (res: any) => {
        const token = res?.data?.accessToken ?? res?.token;
        if (token) {
          this.authSession.setToken(token);
        }
        this.loading.set(false);
        this.toast.show('Welcome back — you are signed in.', 'success');
        this.router.navigate(['/app/dashboard'], { replaceUrl: true });
      },
      error: (err) => {
        this.loading.set(false);
        const message = getErrorMessage(err, 'Unable to sign in. Please try again.');
        this.formError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }
}
