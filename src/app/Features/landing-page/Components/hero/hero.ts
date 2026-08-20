import { Component } from '@angular/core';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';

@Component({
  selector: 'app-hero',
  imports: [EgpCurrencyPipe],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {

}
