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
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'My Profile',
    'nav.purchases': 'Purchase History',
    'nav.relatives': 'Relatives',
    'nav.logout': 'Logout',

    // Common
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.saving': 'Saving…',
    'common.edit': 'Edit',
    'common.remove': 'Remove',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.loading': 'Loading…',

    // Dashboard
    'dashboard.title': 'Welcome back',
    'dashboard.subtitle': "Here's a snapshot of your medical record and recent activity.",
    'dashboard.errorTitle': "Couldn't load your dashboard",
    'dashboard.errorDesc': 'Please check your connection and try again.',
    'dashboard.totalPurchases': 'Total Purchases',
    'dashboard.recentSpend': 'Recent Spend',
    'dashboard.totalReceipts': 'Total Receipts',
    'dashboard.activeChronic': 'Active Chronic Diseases',
    'dashboard.allergiesCount': 'Allergies',
    'dashboard.recentPurchases': 'Recent Purchases',
    'dashboard.recentMedicines': 'Recent Medicines Purchased',
    'dashboard.recentUpdates': 'Recent Medical Updates',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.editProfile': 'Edit Profile',
    'dashboard.viewReceipts': 'View Receipts',
    'dashboard.updateMedicalInfo': 'Update Medical Information',
    'dashboard.viewAll': 'View all',
    'dashboard.noRecentPurchases': 'No purchases yet',
    'dashboard.noRecentPurchasesDesc': 'Your receipts from any pharmacy will show up here.',
    'dashboard.noRecentMedicines': 'No medicines recorded yet',
    'dashboard.tableReceipt': 'Receipt',
    'dashboard.tablePharmacy': 'Pharmacy',
    'dashboard.tableDate': 'Date',
    'dashboard.tableTotal': 'Total',
    'dashboard.tableStatus': 'Status',
    'dashboard.qtyLabel': 'Qty {qty}',

    // Profile shell / tabs
    'profile.title': 'My Profile',
    'profile.subtitle': 'Keep your medical information up to date so pharmacists can serve you safely.',
    'profile.tabs.personal': 'Personal Info',
    'profile.tabs.medical': 'Medicine History',
    'profile.tabs.allergies': 'Allergies',
    'profile.tabs.chronic': 'Chronic Diseases',
    'profile.tabs.organs': 'Organ Functions',

    // Personal info
    'personalInfo.fullName': 'Full name',
    'personalInfo.phone': 'Phone number',
    'personalInfo.readOnly': 'Read only',
    'personalInfo.email': 'Email',
    'personalInfo.dob': 'Date of birth',
    'personalInfo.address': 'Address',
    'personalInfo.notes': 'Notes',
    'personalInfo.unsavedChanges': 'You have unsaved changes.',
    'personalInfo.saveChanges': 'Save changes',
    'personalInfo.saving': 'Saving…',
    'personalInfo.saved': 'Profile updated',

    // AI safety explanations (shared across medical sections)
    'ai.allergiesExplain':
      'Keep your allergy list up to date so our AI can help detect medications that may cause allergic reactions and improve medication safety.',
    'ai.chronicExplain':
      'Add your chronic conditions to help the AI understand your long-term health and provide safer medication recommendations.',
    'ai.organsExplain':
      'Update kidney, liver, and other organ functions so the AI can detect medicines that require dosage adjustments or should be avoided.',
    'ai.medicineHistoryExplain':
      "Review medicines you've purchased from participating pharmacies. This helps the AI understand your medication history.",

    // Allergies
    'allergies.title': 'Allergies',
    'allergies.add': 'Add Allergy',
    'allergies.allAdded': 'All catalog allergies are already added.',
    'allergies.emptyTitle': 'No allergies have been added yet.',
    'allergies.emptyDesc': 'Add any known allergies so pharmacists can flag unsafe medicines.',
    'allergies.removeConfirmTitle': 'Remove this allergy?',
    'allergies.removeConfirmMessage': 'You can always add it back later if needed.',
    'allergies.removeAria': 'Remove {name}',
    'allergies.added': 'Allergy added',
    'allergies.removed': 'Allergy removed',

    // Chronic conditions
    'chronic.title': 'Chronic Conditions',
    'chronic.add': 'Add Condition',
    'chronic.allAdded': 'All catalog conditions are already added.',
    'chronic.emptyTitle': 'No chronic conditions recorded',
    'chronic.emptyDesc': 'Add any long-term conditions like diabetes or hypertension.',
    'chronic.removeConfirmTitle': 'Remove this condition?',
    'chronic.removeConfirmMessage': 'You can always add it back later if needed.',
    'chronic.added': 'Condition added',
    'chronic.removed': 'Condition removed',

    // Organ functions
    'organs.title': 'Organ Functions',
    'organs.add': 'Update Organ Function',
    'organs.emptyTitle': 'No organ function data recorded',
    'organs.emptyDesc': 'Add organ impairment levels if you have reduced kidney, liver, or heart function.',
    'organs.currentStatus': 'Current status',
    'organs.lastUpdated': 'Last updated {date}',
    'organs.addTitle': 'Add organ function',
    'organs.updateTitle': 'Update organ function',
    'organs.organLabel': 'Organ',
    'organs.levelLabel': 'Impairment level',
    'organs.saved': 'Organ function saved',

    // Medicine history
    'medicineHistory.title': 'Medicine History',
    'medicineHistory.searchPlaceholder': 'Search medicine…',
    'medicineHistory.emptyTitle': 'No medicine history available.',
    'medicineHistory.emptyDesc': 'Records added by your pharmacist will appear here.',
    'medicineHistory.active': 'Active',
    'medicineHistory.stopped': 'Stopped',
    'medicineHistory.qty': 'Qty {qty}',

    // Relatives
    'relatives.title': 'Relatives',
    'relatives.subtitle': 'People linked to your account. This list is view-only.',
    'relatives.emptyTitle': 'No relatives linked to your account.',
    'relatives.emptyDesc': 'Relatives added by your pharmacist will appear here.',
    'relatives.noticeTitle': 'Need to add a family member?',
    'relatives.noticeMessage':
      'Family members can only be linked by your pharmacy to ensure medical records remain accurate. Please visit your participating pharmacy and ask the pharmacist to link your relative to your account.',
    'relatives.findPharmacy': 'Find Participating Pharmacy',
    'relatives.findPharmacyComingSoon': "This feature isn't available yet. Please check back soon.",

    // Purchase history
    'purchases.title': 'Purchase History',
    'purchases.subtitle': "All your receipts, from every pharmacy you've visited.",
    'purchases.searchLabel': 'Search receipt #',
    'purchases.searchPlaceholder': 'e.g. INV-1042',
    'purchases.searching': 'Searching…',
    'purchases.pharmacyLabel': 'Pharmacy',
    'purchases.allPharmacies': 'All pharmacies',
    'purchases.statusLabel': 'Status',
    'purchases.allStatuses': 'All statuses',
    'purchases.dateFromLabel': 'From',
    'purchases.dateToLabel': 'To',
    'purchases.clearFilters': 'Clear',
    'purchases.activeFilters': 'Active filters',
    'purchases.receiptNumber': 'Receipt #',
    'purchases.date': 'Date',
    'purchases.pharmacy': 'Pharmacy',
    'purchases.items': 'Items',
    'purchases.total': 'Total',
    'purchases.status': 'Status',
    'purchases.action': 'Action',
    'purchases.view': 'View',
    'purchases.showingSummary': 'Page {page} of {totalPages} · {total} receipts',
    'purchases.noResultsTitle': 'No receipts found',
    'purchases.noResultsDesc': 'Try adjusting your filters, or check back after your next purchase.',
    'purchases.neverPurchasedTitle': "You haven't made a purchase yet",
    'purchases.neverPurchasedDesc': 'Once you buy from a participating pharmacy, your receipts will show up here.',
    'purchases.prev': 'Prev',
    'purchases.next': 'Next',
    'purchases.pageOf': 'Page {page} of {totalPages}',
    'purchases.loading': 'Loading your purchases…',

    // Receipt detail
    'receiptDetail.back': 'Back to purchase history',
    'receiptDetail.notFoundTitle': 'Receipt not found',
    'receiptDetail.notFoundDesc': 'This receipt may have been removed, or the link is incorrect.',
    'receiptDetail.receiptLabel': 'Receipt',
    'receiptDetail.date': 'Date',
    'receiptDetail.pharmacy': 'Pharmacy',
    'receiptDetail.paymentMethod': 'Payment method',
    'receiptDetail.items': 'Items',
    'receiptDetail.medicine': 'Medicine',
    'receiptDetail.quantity': 'Quantity',
    'receiptDetail.price': 'Price',
    'receiptDetail.discount': 'Discount',
    'receiptDetail.total': 'Total',
    'receiptDetail.subtotal': 'Subtotal',
    'receiptDetail.tax': 'Tax',
    'receiptDetail.grandTotal': 'Grand total',
    'receiptDetail.paidAmount': 'Paid amount',

    // Sale statuses (ASSUMPTION — confirm against the real SaleStatus enum)
    'status.pending': 'Pending',
    'status.completed': 'Completed',
    'status.refunded': 'Refunded',
    'status.cancelled': 'Cancelled',
    'status.unknown': 'Unknown',
  },
  ar: {
    // Nav
    'nav.dashboard': 'الرئيسية',
    'nav.profile': 'ملفي الطبي',
    'nav.purchases': 'سجل المشتريات',
    'nav.relatives': 'الأقارب',
    'nav.logout': 'تسجيل الخروج',

    // Common
    'common.retry': 'إعادة المحاولة',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.saving': 'جارٍ الحفظ…',
    'common.edit': 'تعديل',
    'common.remove': 'إزالة',
    'common.close': 'إغلاق',
    'common.back': 'رجوع',
    'common.loading': 'جارٍ التحميل…',

    // Dashboard
    'dashboard.title': 'أهلاً بعودتك',
    'dashboard.subtitle': 'هذه لمحة عن ملفك الطبي ونشاطك الأخير.',
    'dashboard.errorTitle': 'تعذّر تحميل لوحة التحكم',
    'dashboard.errorDesc': 'يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
    'dashboard.totalPurchases': 'إجمالي المشتريات',
    'dashboard.recentSpend': 'الإنفاق الأخير',
    'dashboard.totalReceipts': 'إجمالي الفواتير',
    'dashboard.activeChronic': 'الأمراض المزمنة النشطة',
    'dashboard.allergiesCount': 'الحساسيات',
    'dashboard.recentPurchases': 'آخر المشتريات',
    'dashboard.recentMedicines': 'آخر الأدوية المشتراة',
    'dashboard.recentUpdates': 'آخر التحديثات الطبية',
    'dashboard.quickActions': 'إجراءات سريعة',
    'dashboard.editProfile': 'تعديل الملف الشخصي',
    'dashboard.viewReceipts': 'عرض الفواتير',
    'dashboard.updateMedicalInfo': 'تحديث البيانات الطبية',
    'dashboard.viewAll': 'عرض الكل',
    'dashboard.noRecentPurchases': 'لا توجد مشتريات بعد',
    'dashboard.noRecentPurchasesDesc': 'ستظهر هنا فواتيرك من أي صيدلية.',
    'dashboard.noRecentMedicines': 'لا توجد أدوية مسجّلة بعد',
    'dashboard.tableReceipt': 'الفاتورة',
    'dashboard.tablePharmacy': 'الصيدلية',
    'dashboard.tableDate': 'التاريخ',
    'dashboard.tableTotal': 'الإجمالي',
    'dashboard.tableStatus': 'الحالة',
    'dashboard.qtyLabel': 'الكمية {qty}',

    // Profile shell / tabs
    'profile.title': 'ملفي الطبي',
    'profile.subtitle': 'حافظ على تحديث بياناتك الطبية ليتمكن الصيادلة من خدمتك بأمان.',
    'profile.tabs.personal': 'البيانات الشخصية',
    'profile.tabs.medical': 'سجل الأدوية',
    'profile.tabs.allergies': 'الحساسيات',
    'profile.tabs.chronic': 'الأمراض المزمنة',
    'profile.tabs.organs': 'وظائف الأعضاء',

    // Personal info
    'personalInfo.fullName': 'الاسم الكامل',
    'personalInfo.phone': 'رقم الهاتف',
    'personalInfo.readOnly': 'للقراءة فقط',
    'personalInfo.email': 'البريد الإلكتروني',
    'personalInfo.dob': 'تاريخ الميلاد',
    'personalInfo.address': 'العنوان',
    'personalInfo.notes': 'ملاحظات',
    'personalInfo.unsavedChanges': 'لديك تغييرات غير محفوظة.',
    'personalInfo.saveChanges': 'حفظ التغييرات',
    'personalInfo.saving': 'جارٍ الحفظ…',
    'personalInfo.saved': 'تم تحديث الملف الشخصي',

    // AI safety explanations
    'ai.allergiesExplain': 'حافظ على تحديث قائمة حساسيتك ليتمكن الذكاء الاصطناعي من رصد الأدوية التي قد تسبب لك حساسية وتحسين سلامة الدواء.',
    'ai.chronicExplain': 'أضف أمراضك المزمنة لمساعدة الذكاء الاصطناعي على فهم حالتك الصحية طويلة المدى وتقديم توصيات دوائية أكثر أماناً.',
    'ai.organsExplain': 'حدّث وظائف الكلى والكبد وغيرها من الأعضاء ليتمكن الذكاء الاصطناعي من رصد الأدوية التي تحتاج لتعديل الجرعة أو يجب تجنبها.',
    'ai.medicineHistoryExplain': 'راجع الأدوية التي اشتريتها من الصيدليات المشاركة. هذا يساعد الذكاء الاصطناعي على فهم تاريخك الدوائي.',

    // Allergies
    'allergies.title': 'الحساسيات',
    'allergies.add': 'إضافة حساسية',
    'allergies.allAdded': 'تمت إضافة جميع الحساسيات المتاحة بالفعل.',
    'allergies.emptyTitle': 'لم تتم إضافة أي حساسية بعد.',
    'allergies.emptyDesc': 'أضف أي حساسية معروفة ليتمكن الصيادلة من تجنب الأدوية غير الآمنة.',
    'allergies.removeConfirmTitle': 'إزالة هذه الحساسية؟',
    'allergies.removeConfirmMessage': 'يمكنك إضافتها مرة أخرى لاحقاً إذا لزم الأمر.',
    'allergies.removeAria': 'إزالة {name}',
    'allergies.added': 'تمت إضافة الحساسية',
    'allergies.removed': 'تمت إزالة الحساسية',

    // Chronic conditions
    'chronic.title': 'الأمراض المزمنة',
    'chronic.add': 'إضافة مرض',
    'chronic.allAdded': 'تمت إضافة جميع الأمراض المتاحة بالفعل.',
    'chronic.emptyTitle': 'لا توجد أمراض مزمنة مسجّلة',
    'chronic.emptyDesc': 'أضف أي مرض مزمن مثل السكري أو ارتفاع ضغط الدم.',
    'chronic.removeConfirmTitle': 'إزالة هذا المرض؟',
    'chronic.removeConfirmMessage': 'يمكنك إضافته مرة أخرى لاحقاً إذا لزم الأمر.',
    'chronic.added': 'تمت إضافة المرض',
    'chronic.removed': 'تمت إزالة المرض',

    // Organ functions
    'organs.title': 'وظائف الأعضاء',
    'organs.add': 'تحديث وظيفة عضو',
    'organs.emptyTitle': 'لا توجد بيانات مسجّلة لوظائف الأعضاء',
    'organs.emptyDesc': 'أضف مستوى القصور إذا كان لديك ضعف في وظائف الكلى أو الكبد أو القلب.',
    'organs.currentStatus': 'الحالة الحالية',
    'organs.lastUpdated': 'آخر تحديث {date}',
    'organs.addTitle': 'إضافة وظيفة عضو',
    'organs.updateTitle': 'تحديث وظيفة عضو',
    'organs.organLabel': 'العضو',
    'organs.levelLabel': 'مستوى القصور',
    'organs.saved': 'تم حفظ وظيفة العضو',

    // Medicine history
    'medicineHistory.title': 'سجل الأدوية',
    'medicineHistory.searchPlaceholder': 'ابحث عن دواء…',
    'medicineHistory.emptyTitle': 'لا يوجد سجل أدوية متاح.',
    'medicineHistory.emptyDesc': 'السجلات التي يضيفها الصيدلي ستظهر هنا.',
    'medicineHistory.active': 'نشط',
    'medicineHistory.stopped': 'متوقف',
    'medicineHistory.qty': 'الكمية {qty}',

    // Relatives
    'relatives.title': 'الأقارب',
    'relatives.subtitle': 'الأشخاص المرتبطون بحسابك. هذه القائمة للعرض فقط.',
    'relatives.emptyTitle': 'لا يوجد أقارب مرتبطون بحسابك.',
    'relatives.emptyDesc': 'الأقارب الذين يضيفهم الصيدلي سيظهرون هنا.',
    'relatives.noticeTitle': 'تحتاج لإضافة أحد أفراد العائلة؟',
    'relatives.noticeMessage': 'لا يمكن ربط أفراد العائلة إلا من قبل الصيدلية لضمان دقة السجلات الطبية. يرجى زيارة صيدلية مشاركة وطلب ربط قريبك بحسابك من الصيدلي.',
    'relatives.findPharmacy': 'البحث عن صيدلية مشاركة',
    'relatives.findPharmacyComingSoon': 'هذه الميزة غير متاحة بعد. يرجى التحقق مرة أخرى قريباً.',

    // Purchase history
    'purchases.title': 'سجل المشتريات',
    'purchases.subtitle': 'كل فواتيرك، من كل صيدلية تعاملت معها.',
    'purchases.searchLabel': 'ابحث برقم الفاتورة',
    'purchases.searchPlaceholder': 'مثال: INV-1042',
    'purchases.searching': 'جارٍ البحث…',
    'purchases.pharmacyLabel': 'الصيدلية',
    'purchases.allPharmacies': 'كل الصيدليات',
    'purchases.statusLabel': 'الحالة',
    'purchases.allStatuses': 'كل الحالات',
    'purchases.dateFromLabel': 'من',
    'purchases.dateToLabel': 'إلى',
    'purchases.clearFilters': 'مسح',
    'purchases.activeFilters': 'الفلاتر المفعّلة',
    'purchases.receiptNumber': 'رقم الفاتورة',
    'purchases.date': 'التاريخ',
    'purchases.pharmacy': 'الصيدلية',
    'purchases.items': 'عدد الأصناف',
    'purchases.total': 'الإجمالي',
    'purchases.status': 'الحالة',
    'purchases.action': 'إجراء',
    'purchases.view': 'عرض',
    'purchases.showingSummary': 'صفحة {page} من {totalPages} · {total} فاتورة',
    'purchases.noResultsTitle': 'لا توجد فواتير مطابقة',
    'purchases.noResultsDesc': 'جرّب تعديل الفلاتر، أو تحقق لاحقاً بعد عملية الشراء القادمة.',
    'purchases.neverPurchasedTitle': 'لم تقم بأي عملية شراء بعد',
    'purchases.neverPurchasedDesc': 'بمجرد الشراء من صيدلية مشاركة، ستظهر فواتيرك هنا.',
    'purchases.prev': 'السابق',
    'purchases.next': 'التالي',
    'purchases.pageOf': 'صفحة {page} من {totalPages}',
    'purchases.loading': 'جارٍ تحميل مشترياتك…',

    // Receipt detail
    'receiptDetail.back': 'العودة إلى سجل المشتريات',
    'receiptDetail.notFoundTitle': 'الفاتورة غير موجودة',
    'receiptDetail.notFoundDesc': 'ربما تمت إزالة هذه الفاتورة، أو أن الرابط غير صحيح.',
    'receiptDetail.receiptLabel': 'الفاتورة',
    'receiptDetail.date': 'التاريخ',
    'receiptDetail.pharmacy': 'الصيدلية',
    'receiptDetail.paymentMethod': 'طريقة الدفع',
    'receiptDetail.items': 'الأصناف',
    'receiptDetail.medicine': 'الدواء',
    'receiptDetail.quantity': 'الكمية',
    'receiptDetail.price': 'السعر',
    'receiptDetail.discount': 'الخصم',
    'receiptDetail.total': 'الإجمالي',
    'receiptDetail.subtotal': 'المجموع الفرعي',
    'receiptDetail.tax': 'الضريبة',
    'receiptDetail.grandTotal': 'الإجمالي الكلي',
    'receiptDetail.paidAmount': 'المبلغ المدفوع',

    // Sale statuses (ASSUMPTION — confirm against the real SaleStatus enum)
    'status.pending': 'قيد الانتظار',
    'status.completed': 'مكتملة',
    'status.refunded': 'مسترجعة',
    'status.cancelled': 'ملغاة',
    'status.unknown': 'غير معروفة',
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

  // Key lookup with optional {placeholder} interpolation, e.g.
  // t('purchases.showingSummary', { page: 1, totalPages: 3, total: 42 }). Falls back to
  // English, then to the raw key, so a missing translation never renders as blank text.
  t(key: string, params?: Record<string, string | number>): string {
    const template = DICTIONARY[this.langState()][key] ?? DICTIONARY.en[key] ?? key;
    if (!params) return template;
    return Object.keys(params).reduce(
      (result, paramKey) => result.replace(`{${paramKey}}`, String(params[paramKey])),
      template,
    );
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