import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentVerificationService } from '../Services/payment-verification.service';
import { PaymentInstructions } from '../Models/payment-instructions.model';
import { SubmitPaymentProofRequest } from '../Models/payment-verification.model';
import { receiptFileValidator } from '../Validators/custom-validators';
import { Toast } from '../../../Shared/Toasts/toast';

@Component({
  selector: 'app-submit-payment-proof',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './submit-payment-proof.html',
  styleUrl: './submit-payment-proof.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmitPaymentProof implements OnInit {
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
    return data ? `${data.referenceCode} · ${data.planTier} · ${data.currency} ${data.amountDue}` : '';
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
          this.toast.show(result.message ?? 'Could not load payment details.', 'error');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.show('Could not load payment details.', 'error');
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
    if (errors['required']) return 'This field is required.';
    if (errors['maxlength']) return `Must not exceed ${errors['maxlength'].requiredLength} characters.`;
    if (errors['min']) return `Must be at least ${errors['min'].min}.`;
    if (errors['invalidFileType']) return 'File must be a JPG, PNG, or PDF.';
    if (errors['fileTooLarge']) return 'File must be under 5MB.';
    return 'Invalid value.';
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
          this.toast.show(uploadResult.message ?? 'Receipt upload failed.', 'error');
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
              this.toast.show(submitResult.message ?? 'Could not submit payment proof.', 'error');
            }
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toast.show('Could not submit payment proof.', 'error');
          },
        });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.show('Receipt upload failed.', 'error');
      },
    });
  }
}