import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CopyField } from '../Components/copy-field/copy-field';
import { PaymentInstructions as PaymentInstructionsModel } from '../Models/payment-instructions.model';
import { PaymentVerificationService } from '../Services/payment-verification.service';
import { Toast } from '../../../Shared/Toasts/toast';
import { formatCurrency } from '../../../Shared/utils/currency.util';
import { I18nService } from '../../../Core/Services/i18n.service';

@Component({
  selector: 'app-payment-instructions',
  standalone: true,
  imports: [RouterLink, CopyField],
  templateUrl: './payment-instructions.html',
  styleUrl: './payment-instructions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentInstructions implements OnInit {
  protected readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentVerificationService);
  private toast = inject(Toast);

  readonly subscriptionId = this.route.snapshot.paramMap.get('subscriptionId')!;

  readonly isLoading = signal(true);
  readonly instructions = signal<PaymentInstructionsModel | null>(null);

  readonly planLabel = computed(() => {
    const data = this.instructions();
    return data ? `${data.planTier} · ${data.billingCycle}` : '';
  });

  readonly amountLabel = computed(() => {
    const data = this.instructions();
    return data ? formatCurrency(data.amountDue) : '';
  });

  ngOnInit(): void {
    this.paymentService.getInstructions(this.subscriptionId).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        if (result.success && result.data) {
          this.instructions.set(result.data);
        } else {
          this.toast.show(result.message ?? this.i18n.text('subscription.loadInstructionsError'), 'error');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.show(this.i18n.text('subscription.loadInstructionsError'), 'error');
      },
    });
  }
}
