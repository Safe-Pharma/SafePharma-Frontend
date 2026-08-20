import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type UserLanguageCode = 'en' | 'ar';

@Injectable({
  providedIn: 'root',
})
export class UserLanguage {
  private apiUrl = 'https://localhost:7259/api/UserLanguage';
  private readonly document = inject(DOCUMENT);
  private readonly savedLanguageState = signal<UserLanguageCode>('en');
  private readonly previewLanguageState = signal<UserLanguageCode | null>(null);

  readonly savedLanguage = computed(() => this.savedLanguageState());
  readonly language = computed(
    () => this.previewLanguageState() ?? this.savedLanguageState(),
  );
  readonly direction = computed<'ltr' | 'rtl'>(() =>
    this.language() === 'ar' ? 'rtl' : 'ltr',
  );

  constructor(private http: HttpClient) {}

  getLanguage(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(
      tap((response: any) => {
        const language = this.normalizeLanguage(response?.message ?? response?.data?.language ?? response?.language);
        this.savedLanguageState.set(language);
        this.previewLanguageState.set(null);
        this.applyDocumentLanguage(language);
      }),
    );
  }

  updateLanguage(language: string): Observable<any> {
    const normalized = this.normalizeLanguage(language);
    return this.http.put(this.apiUrl, { language: normalized }).pipe(
      tap(() => {
        this.savedLanguageState.set(normalized);
        this.previewLanguageState.set(null);
        this.applyDocumentLanguage(normalized);
      }),
    );
  }

  preview(language: string): void {
    const normalized = this.normalizeLanguage(language);
    this.previewLanguageState.set(normalized);
    this.applyDocumentLanguage(normalized);
  }

  restoreSaved(): void {
    this.previewLanguageState.set(null);
    this.applyDocumentLanguage(this.savedLanguageState());
  }

  private normalizeLanguage(value: unknown): UserLanguageCode {
    return String(value).toLowerCase() === 'ar' ? 'ar' : 'en';
  }

  private applyDocumentLanguage(language: UserLanguageCode): void {
    this.document.documentElement.setAttribute('lang', language);
    this.document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }
}
