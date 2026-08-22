import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval, startWith, switchMap, takeWhile } from 'rxjs';
import { PaymentVerificationService } from '../Services/payment-verification.service';
import { PaymentVerificationRead } from '../Models/payment-verification.model';
import { Toast } from '../../../Shared/Toasts/toast';
import { I18nService } from '../../../Core/Services/i18n.service';

const POLL_INTERVAL_MS = 10_000;

@Component({
  selector: 'app-payment-under-review',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payment-under-review.html',
  styleUrl: './payment-under-review.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentUnderReview implements OnInit {
  protected readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentVerificationService);
  private toast = inject(Toast);
  private destroyRef = inject(DestroyRef);

  readonly subscriptionId = this.route.snapshot.paramMap.get('subscriptionId')!;

  readonly isLoading = signal(true);
  readonly verification = signal<PaymentVerificationRead | null>(null);

  readonly statusLabel = computed(() => {
    switch (this.verification()?.status) {
      case 'Approved':
        return this.i18n.text('subscription.approved');
      case 'Rejected':
        return this.i18n.text('subscription.rejected');
      default:
        return this.i18n.text('subscription.pendingVerification');
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
    // Poll every 10s while the owner hasn't reviewed it yet — this page has no
    // JWT to open a SignalR connection with (the account only exists after
    // approval), and the event we're waiting for is a one-off, hours-away
    // thing, not something that needs a live socket.
    interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.paymentService.getStatus(this.subscriptionId)),
        // Keep polling while still Pending (or while a request failed); stop
        // right after the emission that actually resolves it, so the final
        // Approved/Rejected state still reaches the UI before we unsubscribe.
        takeWhile((result) => !(result.success && result.data && result.data.status !== 'Pending'), true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);
          if (result.success && result.data) {
            this.verification.set(result.data);
          } else if (!this.verification()) {
            // Only surface the error before we've ever had a successful read —
            // a transient failure on a later poll shouldn't nuke what's on screen.
            this.toast.show(result.message ?? this.i18n.text('subscription.loadStatusError'), 'error');
          }
        },
        error: () => {
          this.isLoading.set(false);
          if (!this.verification()) {
            this.toast.show(this.i18n.text('subscription.loadStatusError'), 'error');
          }
        },
      });
  }
}
