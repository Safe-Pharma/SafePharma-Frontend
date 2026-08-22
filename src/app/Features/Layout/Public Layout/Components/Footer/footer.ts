import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
})
export class Footer {
  readonly i18n = inject(I18nService);
  currentYear = new Date().getFullYear();
  text(key: string): string { return this.i18n.text(key); }
}
