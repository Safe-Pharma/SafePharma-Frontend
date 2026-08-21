import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentVerificationService } from '../Services/payment-verification.service';
import { PaymentInstructions } from '../Models/payment-instructions.model';
import { SubmitPaymentProofRequest } from '../Models/payment-verification.model';
import { receiptFileValidator } from '../Validators/custom-validators';
import { Toast } from '../../../Shared/Toasts/toast';
import { formatCurrency } from '../../../Shared/utils/currency.util';
import { I18nService } from '../../../Core/Services/i18n.service';

@Component({
  selector: 'app-submit-payment-proof',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './submit-payment-proof.html',
  styleUrl: './submit-payment-proof.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmitPaymentProof implements OnInit {
  protected readonly i18n = inject(I18nService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentVerificationService);
  private toast = inject(Toast);

  readonly subscriptionId = this.route.snapshot.paramMap.get('subscriptionId')!;
  readonly today = new Date().toISOString().slice(0, 10);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly instructions = signal<PaymentInstructions | null>(null);
  readonly selectedFileName = signal<string | null>(null);

  readonly summaryLabel = computed(() => {
    const data = this.instructions();
    return data ? `${data.referenceCode} · ${data.planTier} · ${formatCurrency(data.amountDue)}` : '';
  });

  form = this.fb.group({
    paymentMethod: ['', Validators.required],
    transactionReference: ['', [Validators.required, Validators.maxLength(64)]],
    paymentDate: [this.today, Validators.required],
    paidAmount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    receipt: this.fb.control<File | null>(null, [Validators.required, receiptFileValidator]),
  });

  ngOnInit(): void {
    this.paymentService.getInstructions(this.subscriptionId).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        if (result.success && result.data) {
          this.instructions.set(result.data);
          this.form.patchValue({
            paidAmount: result.data.amountDue,
            paymentMethod: result.data.paymentMethods[0]?.methodName ?? '',
          });
        } else {
          this.toast.show(result.message ?? this.i18n.text('subscription.loadDetailsError'), 'error');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.show(this.i18n.text('subscription.loadDetailsError'), 'error');
      },
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.form.controls.receipt.setValue(file);
    this.form.controls.receipt.markAsTouched();
    this.selectedFileName.set(file?.name ?? null);
  }

  getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.touched || !control.errors) return '';
    const errors = control.errors;
    if (errors['required']) return this.i18n.text('subscribe.required');
    if (errors['maxlength']) return this.i18n.text('subscribe.maxLength', { value: errors['maxlength'].requiredLength });
    if (errors['min']) return this.i18n.text('subscribe.min', { value: errors['min'].min });
    if (errors['invalidFileType']) return this.i18n.text('subscription.fileTypeError');
    if (errors['fileTooLarge']) return this.i18n.text('subscription.fileSizeError');
    return this.i18n.text('subscribe.invalidValue');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { paymentMethod, transactionReference, paymentDate, paidAmount, receipt } = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.paymentService.uploadReceipt(this.subscriptionId, receipt!).subscribe({
      next: (uploadResult) => {
        if (!uploadResult.success || !uploadResult.data) {
          this.isSubmitting.set(false);
          this.toast.show(uploadResult.message ?? this.i18n.text('subscription.receiptUploadFailed'), 'error');
          return;
        }

        const request: SubmitPaymentProofRequest = {
          paymentMethod: paymentMethod!,
          transactionReference: transactionReference!,
          paymentDate: paymentDate!,
          paidAmount: paidAmount!,
          receiptUrl: uploadResult.data,
        };

        this.paymentService.submitProof(this.subscriptionId, request).subscribe({
          next: (submitResult) => {
            this.isSubmitting.set(false);
            if (submitResult.success) {
              this.router.navigate(['/subscribe', this.subscriptionId, 'payment', 'review']);
            } else {
              this.toast.show(submitResult.message ?? this.i18n.text('subscription.submitProofError'), 'error');
            }
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toast.show(this.i18n.text('subscription.submitProofError'), 'error');
          },
        });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.show(this.i18n.text('subscription.receiptUploadRetry'), 'error');
      },
    });
  }
}
