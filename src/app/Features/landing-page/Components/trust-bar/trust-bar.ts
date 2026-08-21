import { Component, inject } from '@angular/core';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-trust-bar',
  imports: [],
  templateUrl: './trust-bar.html',
  styleUrl: './trust-bar.css',
})
export class TrustBar {
  protected readonly i18n = inject(I18nService);
}
