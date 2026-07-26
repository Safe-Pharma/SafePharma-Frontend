import { Injectable, computed, signal } from '@angular/core';

export type PortalLanguage = 'en' | 'ar';

// Small, dependency-free i18n layer for the portal only. The staff app has no localization
// need today, so this intentionally isn't a project-wide ngx-translate integration — just
// enough to satisfy "the portal must support English/Arabic with RTL" without pulling in a
// new dependency for a single feature. If localization later spreads to the rest of the
// app, this is the seam to swap out for a proper i18n library.
const STORAGE_KEY = 'portal_lang';

const DICTIONARY: Record<PortalLanguage, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'My Profile',
    'nav.purchases': 'Purchase History',
    'nav.relatives': 'Relatives',
    'nav.logout': 'Logout',
    'dashboard.title': 'Welcome back',
    'dashboard.totalPurchases': 'Total Purchases',
    'dashboard.totalReceipts': 'Total Receipts',
    'dashboard.activeChronic': 'Active Chronic Diseases',
    'dashboard.allergiesCount': 'Allergies',
    'dashboard.recentPurchases': 'Recent Purchases',
    'dashboard.recentMedicines': 'Recent Medicines Purchased',
    'dashboard.recentUpdates': 'Recent Medical Updates',
    'dashboard.quickActions': 'Quick Actions',
    'profile.title': 'My Profile',
    'profile.personal': 'Personal Information',
    'profile.medicineHistory': 'Medicine History',
    'profile.allergies': 'Allergies',
    'profile.chronic': 'Chronic Diseases',
    'profile.organs': 'Organ Functions',
    'purchases.title': 'Purchase History',
    'relatives.title': 'Relatives',
  },
  ar: {
    'nav.dashboard': 'الرئيسية',
    'nav.profile': 'ملفي الطبي',
    'nav.purchases': 'سجل المشتريات',
    'nav.relatives': 'الأقارب',
    'nav.logout': 'تسجيل الخروج',
    'dashboard.title': 'أهلاً بعودتك',
    'dashboard.totalPurchases': 'إجمالي المشتريات',
    'dashboard.totalReceipts': 'إجمالي الفواتير',
    'dashboard.activeChronic': 'الأمراض المزمنة النشطة',
    'dashboard.allergiesCount': 'الحساسيات',
    'dashboard.recentPurchases': 'آخر المشتريات',
    'dashboard.recentMedicines': 'آخر الأدوية المشتراة',
    'dashboard.recentUpdates': 'آخر التحديثات الطبية',
    'dashboard.quickActions': 'إجراءات سريعة',
    'profile.title': 'ملفي الطبي',
    'profile.personal': 'البيانات الشخصية',
    'profile.medicineHistory': 'سجل الأدوية',
    'profile.allergies': 'الحساسيات',
    'profile.chronic': 'الأمراض المزمنة',
    'profile.organs': 'وظائف الأعضاء',
    'purchases.title': 'سجل المشتريات',
    'relatives.title': 'الأقارب',
  },
};

@Injectable({ providedIn: 'root' })
export class PortalI18nService {
  private readonly langState = signal<PortalLanguage>(this.readInitialLanguage());

  readonly lang = computed(() => this.langState());
  readonly dir = computed<'ltr' | 'rtl'>(() => (this.langState() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.langState() === 'ar');

  constructor() {
    this.applyDocumentDir(this.langState());
  }

  setLanguage(lang: PortalLanguage): void {
    localStorage.setItem(STORAGE_KEY, lang);
    this.langState.set(lang);
    this.applyDocumentDir(lang);
  }

  toggle(): void {
    this.setLanguage(this.langState() === 'en' ? 'ar' : 'en');
  }

  // Simple key lookup — falls back to English, then to the raw key so a missing
  // translation never renders as blank text.
  t(key: string): string {
    return DICTIONARY[this.langState()][key] ?? DICTIONARY.en[key] ?? key;
  }

  // Picks the localized name off any {nameEn, nameAr} catalog item.
  localizedName(item: { nameEn: string; nameAr: string } | null | undefined): string {
    if (!item) return '';
    return this.langState() === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr;
  }

  private readInitialLanguage(): PortalLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' ? 'ar' : 'en';
  }

  private applyDocumentDir(lang: PortalLanguage): void {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }
}