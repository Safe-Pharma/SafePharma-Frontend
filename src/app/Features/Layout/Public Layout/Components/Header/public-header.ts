import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { I18nService } from '../../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-header.html',
})
export class PublicHeader {
  readonly i18n = inject(I18nService);
  text(key: string): string { return this.i18n.text(key); }
  toggleLanguage(): void { this.i18n.toggle(); }
}
