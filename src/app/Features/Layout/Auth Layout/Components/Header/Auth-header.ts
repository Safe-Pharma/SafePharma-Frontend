import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-header.html',
})
export class AuthHeader {
  readonly i18n = inject(I18nService);
  text(key: string): string { return this.i18n.text(key); }
  toggleLanguage(): void { this.i18n.toggle(); }
}
