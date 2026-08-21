import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-hero',
  imports: [EgpCurrencyPipe, RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  protected readonly i18n = inject(I18nService);
}
