import { Injectable, computed, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppLanguage, I18nService } from '../../../../Core/Services/i18n.service';

export type UserLanguageCode = AppLanguage;

/** Backwards-compatible adapter; I18nService is now the single source of truth. */
@Injectable({ providedIn: 'root' })
export class UserLanguage {
  private readonly i18n = inject(I18nService);

  readonly savedLanguage = computed(() => this.i18n.userOverride() ?? this.i18n.tenantDefault());
  readonly language = this.i18n.lang;
  readonly direction = this.i18n.dir;

  getLanguage(): Observable<{ language: UserLanguageCode }> {
    this.i18n.initializeForCurrentSession();
    return of({ language: this.savedLanguage() });
  }

  updateLanguage(language: string): Observable<{ language: UserLanguageCode }> {
    const normalized = this.i18n.normalize(language) ?? 'en';
    this.i18n.setUserLanguage(normalized);
    return of({ language: normalized });
  }

  preview(language: string): void {
    this.i18n.setLanguage(this.i18n.normalize(language) ?? 'en', false);
  }

  restoreSaved(): void { this.i18n.restoreResolvedLanguage(); }
}
