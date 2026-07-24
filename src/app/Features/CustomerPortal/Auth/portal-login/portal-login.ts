import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { Toast } from '../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';

@Component({
  selector: 'app-portal-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './portal-login.html',
})
export class PortalLogin {
  private readonly portalAuth = inject(PortalAuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  readonly phone = signal('');
  readonly loading = signal(false);
  readonly touched = signal(false);

  readonly phoneValid = () => /^[0-9+][0-9 ]{7,14}$/.test(this.phone().trim());

  submit(): void {
    this.touched.set(true);
    if (!this.phoneValid() || this.loading()) return;

    this.loading.set(true);
    this.portalAuth.sendOtp(this.phone().trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('We sent a WhatsApp code to your phone.', 'success');
        this.router.navigate(['/portal/otp'], { queryParams: { phone: this.phone().trim() } });
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not send the code. Please try again.'), 'error');
      },
    });
  }
}