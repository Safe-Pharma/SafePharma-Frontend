import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type AppLanguage = 'en' | 'ar';

/** A feature's translation table — one object per language, same key set on both sides. */
export type Dictionary = Record<AppLanguage, Record<string, string>>;

const STORAGE_KEY = 'app_lang';

/**
 * App-wide i18n. This generalizes the pattern that already shipped for the
 * Customer Portal (see CustomerPortal/Services/portal-i18n.service.ts) so the
 * rest of the app (POS, Sales, Customers, ...) can use the same lightweight
 * approach instead of pulling in a full i18n library.
 *
 * Each feature owns its own Dictionary (e.g. pos.i18n.ts) and passes it into
 * t() — this keeps translation files small and colocated with the feature
 * that uses them, instead of one giant ever-growing file.
 *
 * Persistence: staff accounts have their language synced with the backend
 * (GET/PUT /api/UserLanguage) so it follows them across devices; localStorage
 * is just the fast local cache used before that round trip resolves (and the
 * only thing anonymous/portal contexts use).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly langState = signal<AppLanguage>(this.readInitialLanguage());

  readonly lang = computed(() => this.langState());
  readonly dir = computed<'ltr' | 'rtl'>(() => (this.langState() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.langState() === 'ar');

  constructor() {
    this.applyDocumentDir(this.langState());
  }

  /** Call once after login (or on app init for an already-authenticated
   *  session) to pull the language actually saved server-side for this staff
   *  account, in case it differs from what's cached in this browser. */
  loadFromServer(): void {
    this.http
      .get<{ success: boolean; data?: { preferredLanguage?: string } }>(
        `${environment.apiUrl}/UserLanguage`,
      )
      .subscribe({
        next: (res) => {
          const server = res?.data?.preferredLanguage;
          const lang: AppLanguage | null =
            server === 'Arabic' || server === 'ar' ? 'ar' : server === 'English' || server === 'en' ? 'en' : null;
          if (lang) this.setLanguage(lang, false);
        },
        error: () => {}, // not logged in yet, or offline — keep whatever's cached locally
      });
  }

  /** @param persist Also PUTs the choice to the backend for a signed-in staff
   *  user. Pass false when just applying a value we already read *from* the
   *  backend (loadFromServer), to avoid an immediate pointless round trip. */
  setLanguage(lang: AppLanguage, persist = true): void {
    localStorage.setItem(STORAGE_KEY, lang);
    this.langState.set(lang);
    this.applyDocumentDir(lang);

    if (persist) {
      this.http
        .put(`${environment.apiUrl}/UserLanguage`, {
          preferredLanguage: lang === 'ar' ? 'Arabic' : 'English',
        })
        .subscribe({ error: () => {} }); // best-effort — the UI already switched locally either way
    }
  }

  toggle(): void {
    this.setLanguage(this.langState() === 'en' ? 'ar' : 'en');
  }

  /** Key lookup with optional {placeholder} interpolation, e.g.
   *  t(POS_DICT, 'cart.itemsCount', { count: 3 }). Falls back to English,
   *  then to the raw key, so a missing translation never renders blank. */
  t(dict: Dictionary, key: string, params?: Record<string, string | number>): string {
    const template = dict[this.langState()][key] ?? dict.en[key] ?? key;
    if (!params) return template;
    return Object.keys(params).reduce(
      (result, paramKey) => result.replace(`{${paramKey}}`, String(params[paramKey])),
      template,
    );
  }

  /** Picks the localized name off any {nameEn, nameAr}-shaped catalog item
   *  (medicines, allergies, chronic conditions, organs — all already store
   *  both languages in the database). */
  localizedName(item: { nameEn: string; nameAr: string } | null | undefined): string {
    if (!item) return '';
    return this.langState() === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr;
  }

  private readInitialLanguage(): AppLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' ? 'ar' : 'en';
  }

  private applyDocumentDir(lang: AppLanguage): void {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }
}
