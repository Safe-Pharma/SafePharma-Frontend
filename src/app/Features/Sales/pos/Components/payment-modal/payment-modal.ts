import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentMethodChoice, PaySaleDto } from '../../Model/pos.models';
import { ModalOverlayDirective } from '../../../../../Shared/Components/modal-overlay/modal-overlay';
import { EgpCurrencyPipe } from '../../../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../../../Core/Services/i18n.service';
import { POS_DICT } from '../../pos.i18n';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [FormsModule, ModalOverlayDirective, EgpCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-modal.html',
})
export class PaymentModalComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  grandTotal = input.required<number>();
  initialMethod = input<PaymentMethodChoice>('Cash');
  submitting = input(false);

  closed = output<void>();
  confirmed = output<PaySaleDto>();

  protected readonly method = signal<PaymentMethodChoice>('Cash');
  protected readonly cashAmountPaid = signal(0);
  protected readonly cardAmount = signal(0);
  protected readonly mixedCashPortion = signal(0);
  protected readonly mixedCardPortion = signal(0);
  protected readonly mixedAmountPaidInCash = signal(0);

  ngOnInit(): void {
    this.method.set(this.initialMethod());
    this.cashAmountPaid.set(this.grandTotal());
    this.cardAmount.set(this.grandTotal());
  }

  protected selectMethod(m: PaymentMethodChoice) {
    this.method.set(m);
    if (m === 'Cash' && this.cashAmountPaid() === 0) this.cashAmountPaid.set(this.grandTotal());
    if (m === 'Card' && this.cardAmount() === 0) this.cardAmount.set(this.grandTotal());
  }

  protected readonly cashChange = computed(() =>
    Math.max(0, this.cashAmountPaid() - this.grandTotal()),
  );

  protected readonly mixedSplitTotal = computed(
    () => this.mixedCashPortion() + this.mixedCardPortion(),
  );

  protected readonly mixedSplitMatches = computed(
    () => Math.abs(this.mixedSplitTotal() - this.grandTotal()) < 0.005,
  );

  protected readonly mixedChange = computed(() =>
    Math.max(0, this.mixedAmountPaidInCash() - this.mixedCashPortion()),
  );

  protected readonly isValid = computed(() => {
    const total = this.grandTotal();
    switch (this.method()) {
      case 'Cash':
        return this.cashAmountPaid() >= total;
      case 'Card':
        return this.cardAmount() >= total;
      case 'Mixed':
        return (
          this.mixedSplitMatches() &&
          this.mixedCashPortion() >= 0 &&
          this.mixedCardPortion() >= 0 &&
          this.mixedAmountPaidInCash() >= this.mixedCashPortion()
        );
      default:
        return false;
    }
  });

  protected readonly t = (key: string, params?: Record<string, string | number>) => this.i18n.t(POS_DICT, key, params);

  protected onClose() {
    this.closed.emit();
  }

  protected onConfirm() {
    if (!this.isValid() || this.submitting()) return;

    let dto: PaySaleDto;
    if (this.method() === 'Cash') {
      dto = { amountPaidByCash: this.cashAmountPaid(), amountPaidByCard: 0 };
    } else if (this.method() === 'Card') {
      dto = { amountPaidByCash: 0, amountPaidByCard: this.cardAmount() };
    } else {
      dto = {
        amountPaidByCash: this.mixedAmountPaidInCash(),
        amountPaidByCard: this.mixedCardPortion(),
      };
    }
    this.confirmed.emit(dto);
  }
}
