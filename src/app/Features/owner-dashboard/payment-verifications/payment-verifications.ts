import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, finalize } from 'rxjs';
import { I18nService } from '../../../Core/Services/i18n.service';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { PageHeaderComponent } from '../../../Shared/Components/page-header/page-header';
import { formatCurrency } from '../../../Shared/utils/currency.util';
import { ModalShellComponent } from '../../users/components/modal-shell/modal-shell';
import { PaymentVerificationReadDto } from '../Models/payment-verification-read.dto';
import { PaymentVerificationService } from '../Service/payment-verification.service';

type VerificationView = 'pending' | 'all';
type StatusKind = 'pending' | 'approved' | 'rejected' | 'neutral';
type MutationAction = 'approve' | 'reject' | null;

@Component({
  selector: 'app-payment-verifications',
  standalone: true,
  imports: [Spinner, PageHeaderComponent, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-verifications.html',
  styleUrl: './payment-verifications.css',
})
export class PaymentVerificationsPage implements OnInit {
  protected readonly i18n = inject(I18nService);

  private readonly service = inject(PaymentVerificationService);
  private requestSubscription: Subscription | null = null;

  readonly activeView = signal<VerificationView>('pending');
  readonly verifications = signal<PaymentVerificationReadDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedVerification = signal<PaymentVerificationReadDto | null>(null);
  readonly reviewOpen = signal(false);
  readonly receiptImageLoading = signal(false);
  readonly receiptImageError = signal(false);
  readonly rejectDialogOpen = signal(false);
  readonly rejectionReason = signal('');
  readonly rejectionValidation = signal(false);
  readonly mutationAction = signal<MutationAction>(null);
  readonly mutationError = signal<string | null>(null);
  readonly canReview = computed(() => this.statusKind(this.selectedVerification()?.status ?? '') === 'pending');

  ngOnInit(): void {
    this.loadVerifications();
  }

  setView(view: VerificationView): void {
    if (this.activeView() === view) return;

    this.requestSubscription?.unsubscribe();
    this.requestSubscription = null;
    this.activeView.set(view);
    this.verifications.set([]);
    this.loadVerifications();
  }

  loadVerifications(): void {
    this.requestSubscription?.unsubscribe();
    this.error.set(null);
    this.loading.set(true);

    const request = this.activeView() === 'pending'
      ? this.service.getPendingPaymentVerifications()
      : this.service.getPaymentVerifications();

    this.requestSubscription = request.pipe(
      finalize(() => {
        this.loading.set(false);
        this.requestSubscription = null;
      }),
    ).subscribe({
      next: (items) => this.verifications.set(items),
      error: () => this.error.set(this.i18n.text('ownerPaymentVerifications.loadError')),
    });
  }

  openReview(verification: PaymentVerificationReadDto): void {
    this.selectedVerification.set(verification);
    this.reviewOpen.set(true);
    this.receiptImageLoading.set(Boolean(verification.receiptUrl));
    this.receiptImageError.set(false);
    this.rejectionReason.set('');
    this.rejectionValidation.set(false);
    this.mutationError.set(null);
  }

  closeReview(): void {
    if (this.mutationAction()) return;
    this.reviewOpen.set(false);
    this.selectedVerification.set(null);
    this.receiptImageLoading.set(false);
    this.receiptImageError.set(false);
  }

  handleReceiptImageLoad(): void {
    this.receiptImageLoading.set(false);
    this.receiptImageError.set(false);
  }

  handleReceiptImageError(): void {
    this.receiptImageLoading.set(false);
    this.receiptImageError.set(true);
  }

  openRejectDialog(): void {
    if (!this.canReview() || this.mutationAction()) return;
    this.rejectionValidation.set(false);
    this.mutationError.set(null);
    this.rejectDialogOpen.set(true);
  }

  cancelReject(): void {
    if (!this.mutationAction()) this.rejectDialogOpen.set(false);
  }

  confirmApprove(): void {
    const verification = this.selectedVerification();
    if (!verification || !this.canReview() || this.mutationAction()) return;

    this.runMutation('approve', this.service.approvePaymentVerification(verification.id));
  }

  submitReject(): void {
    const verification = this.selectedVerification();
    const reason = this.rejectionReason().trim();
    if (!verification || !this.canReview() || this.mutationAction()) return;

    if (!reason) {
      this.rejectionValidation.set(true);
      return;
    }

    this.runMutation('reject', this.service.rejectPaymentVerification(verification.id, { rejectionReason: reason }));
  }

  setRejectionReason(value: string): void {
    this.rejectionReason.set(value);
    if (value.trim()) this.rejectionValidation.set(false);
  }

  statusKind(status: string): StatusKind {
    switch (status.trim().toLowerCase()) {
      case 'pending': return 'pending';
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      default: return 'neutral';
    }
  }

  statusLabel(status: string): string {
    const key: Record<StatusKind, string | null> = {
      pending: 'ownerPaymentVerifications.statusPending',
      approved: 'ownerPaymentVerifications.statusApproved',
      rejected: 'ownerPaymentVerifications.statusRejected',
      neutral: null,
    };
    const translation = key[this.statusKind(status)];
    return translation ? this.i18n.text(translation) : status || this.i18n.text('ownerPaymentVerifications.unknownStatus');
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.i18n.lang());
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(this.i18n.lang() === 'ar' ? 'ar-EG' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(date);
  }

  private runMutation(action: Exclude<MutationAction, null>, request: Observable<unknown>): void {
    this.mutationAction.set(action);
    this.mutationError.set(null);
    request.pipe(finalize(() => this.mutationAction.set(null))).subscribe({
      next: () => {
        this.rejectDialogOpen.set(false);
        this.reviewOpen.set(false);
        this.selectedVerification.set(null);
        this.loadVerifications();
      },
      error: () => this.mutationError.set(this.i18n.text(action === 'approve'
        ? 'ownerPaymentVerifications.approveError'
        : 'ownerPaymentVerifications.rejectError')),
    });
  }
}
