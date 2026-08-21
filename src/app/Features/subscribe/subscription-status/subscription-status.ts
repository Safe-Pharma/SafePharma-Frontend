import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentVerificationService } from '../Services/payment-verification.service';
import { PaymentVerificationRead } from '../Models/payment-verification.model';
import { Toast } from '../../../Shared/Toasts/toast';
import { DatePipe } from '@angular/common';
import { EgpCurrencyPipe } from '../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../Core/Services/i18n.service';

@Component({
  selector: 'app-subscription-status',
  standalone: true,
  imports: [RouterLink, DatePipe, EgpCurrencyPipe],
  templateUrl: './subscription-status.html',
  styleUrl: './subscription-status.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionStatus implements OnInit {
  protected readonly i18n = inject(I18nService);
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
        return this.i18n.text('subscription.approved');
      case 'Rejected':
        return this.i18n.text('subscription.rejected');
      default:
        return this.i18n.text('subscription.pendingVerification');
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
          this.toast.show(result.message ?? this.i18n.text('subscription.loadStatusError'), 'error');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.show(this.i18n.text('subscription.loadStatusError'), 'error');
      },
    });
  }
}
