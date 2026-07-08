import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentVerificationService } from '../Services/payment-verification.service';
import { PaymentVerificationRead } from '../Models/payment-verification.model';
import { Toast } from '../../../Shared/Toasts/toast';

@Component({
  selector: 'app-payment-under-review',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payment-under-review.html',
  styleUrl: './payment-under-review.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentUnderReview implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentVerificationService);
  private toast = inject(Toast);

  readonly subscriptionId = this.route.snapshot.paramMap.get('subscriptionId')!;

  readonly isLoading = signal(true);
  readonly verification = signal<PaymentVerificationRead | null>(null);

  readonly statusLabel = computed(() => {
    switch (this.verification()?.status) {
      case 'Approved':
        return 'Approved';
      case 'Rejected':
        return 'Rejected';
      default:
        return 'Pending Verification';
    }
  });

  readonly statusClasses = computed(() => {
    switch (this.verification()?.status) {
      case 'Approved':
        return 'bg-success-soft text-success';
      case 'Rejected':
        return 'bg-destructive-soft text-destructive';
      default:
        return 'bg-primary-soft text-primary';
    }
  });

  ngOnInit(): void {
    this.paymentService.getStatus(this.subscriptionId).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        if (result.success && result.data) {
          this.verification.set(result.data);
        } else {
          this.toast.show(result.message ?? 'Could not load submission status.', 'error');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.show('Could not load submission status.', 'error');
      },
    });
  }
}