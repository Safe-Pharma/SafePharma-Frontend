import { Component } from '@angular/core';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';

@Component({
  selector: 'app-pricing',
  imports: [EgpCurrencyPipe],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing {

}
