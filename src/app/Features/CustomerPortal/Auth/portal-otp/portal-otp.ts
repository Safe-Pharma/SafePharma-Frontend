import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { Toast } from '../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';

@Component({
  selector: 'app-portal-otp',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './portal-otp.html',
})
export class PortalOtp {
  private readonly portalAuth = inject(PortalAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(Toast);

  readonly phone = signal(this.route.snapshot.queryParamMap.get('phone') ?? '');
  readonly otp = signal('');
  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly touched = signal(false);

  readonly otpValid = () => /^\d{6}$/.test(this.otp());

  ngOnInit(): void {
    if (!this.phone()) {
      this.router.navigateByUrl('/portal/login');
    }
  }

  onOtpInput(value: string): void {
    this.otp.set(value.replace(/\D/g, '').slice(0, 6));
  }

  verify(): void {
    this.touched.set(true);
    if (!this.otpValid() || this.loading()) return;

    this.loading.set(true);
    this.portalAuth.verifyOtp(this.phone(), this.otp()).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('Welcome back!', 'success');
        this.router.navigateByUrl('/portal/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Invalid or expired code. Please try again.'), 'error');
      },
    });
  }

  resend(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.portalAuth.sendOtp(this.phone()).subscribe({
      next: () => {
        this.resending.set(false);
        this.toast.show('A new code was sent.', 'success');
      },
      error: (err) => {
        this.resending.set(false);
        this.toast.show(getErrorMessage(err, 'Could not resend the code.'), 'error');
      },
    });
  }
}