import { Component, inject } from '@angular/core';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-features-grid',
  imports: [],
  templateUrl: './features-grid.html',
  styleUrl: './features-grid.css',
})
export class FeaturesGrid {
  protected readonly i18n = inject(I18nService);
}
