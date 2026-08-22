import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-pricing',
  imports: [EgpCurrencyPipe, RouterLink],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing {
  protected readonly i18n = inject(I18nService);
}
