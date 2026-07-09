import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentVerificationService } from '../Services/payment-verification.service';
import { PaymentVerificationRead } from '../Models/payment-verification.model';
import { Toast } from '../../../Shared/Toasts/toast';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-subscription-status',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './subscription-status.html',
  styleUrl: './subscription-status.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionStatus implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentVerificationService);
  private toast = inject(Toast);

  readonly subscriptionId = this.route.snapshot.paramMap.get('subscriptionId')!;

  readonly isLoading = signal(true);
  readonly history = signal<PaymentVerificationRead[]>([]);

  // Most recent submission drives the header + hero card
  readonly latest = computed(() => this.history()[0] ?? null);

  readonly statusLabel = computed(() => {
    switch (this.latest()?.status) {
      case 'Approved':
        return 'Approved';
      case 'Rejected':
        return 'Rejected';
      default:
        return 'Pending Verification';
    }
  });

  readonly statusClasses = computed(() => this.classesForStatus(this.latest()?.status));

  classesForStatus(status: PaymentVerificationRead['status'] | undefined): string {
    switch (status) {
      case 'Approved':
        return 'bg-success-soft text-success';
      case 'Rejected':
        return 'bg-destructive-soft text-destructive';
      default:
        return 'bg-primary-soft text-primary';
    }
  }

  ngOnInit(): void {
    this.paymentService.getHistory(this.subscriptionId).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        if (result.success && result.data) {
          this.history.set(result.data);
        } else {
          this.toast.show(result.message ?? 'Could not load subscription status.', 'error');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.show('Could not load subscription status.', 'error');
      },
    });
  }
}