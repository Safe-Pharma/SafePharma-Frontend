import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyLocale, formatCurrency } from '../utils/currency.util';

@Pipe({
  name: 'egpCurrency',
  standalone: true,
  pure: true,
})
export class EgpCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, locale: CurrencyLocale = 'en'): string {
    return formatCurrency(value, locale);
  }
}
