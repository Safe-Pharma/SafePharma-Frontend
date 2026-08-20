import { Dictionary } from '../../../Core/Services/i18n.service';

export const POS_DICT: Dictionary = {
  en: {
    // Tabs
    'tabs.new': 'New tab',
    'tabs.newSale': 'New Sale',
    'tabs.itemCount': '{count} item(s)',
    'tabs.closeConfirm': 'Close this tab? The cart will be discarded.',

    // Search
    'search.placeholder': 'Search by product name, barcode or SKU…',
    'search.searching': 'Searching…',
    'search.noResults': 'No matching product found.',
    'search.stock': 'Stock:',

    // Customer
    'customer.walkIn': 'Walk-in customer',

    // Cart
    'cart.title': 'Cart',
    'cart.itemsSuffix': 'items',
    'cart.emptyTitle': 'Cart is empty',
    'cart.emptyDesc': 'Search by barcode or product name to start a sale.',
    'cart.checkTooltip': 'Check {name} against this customer’s medical profile',
    'cart.relative': 'Relative',
    'cart.noRelative': 'No relative',
    'cart.noRelativesHint': 'No relatives — pick a customer first.',
    'cart.discount': 'Discount',
    'cart.tax': 'Tax',
    'cart.noTax': 'No tax',

    // Order summary
    'summary.title': 'Order summary',
    'summary.subtotal': 'Subtotal',
    'summary.discount': 'Discount',
    'summary.tax': 'Tax',
    'summary.grandTotal': 'GRAND TOTAL',
    'summary.grandTotalMobile': 'Grand total',
    'summary.checkAll': 'Check all before payment',
    'summary.checkingCart': 'Checking cart…',
    'summary.checkingShort': 'Checking…',
    'summary.checkedOk': 'Cart checked — safe to pay',
    'summary.checkAllShort': 'Check all',
    'summary.runCheckFirst': 'Run “Check all” first',
    'summary.pay': 'Pay ${amount}',
    'summary.cash': 'Cash',
    'summary.card': 'Card',
    'summary.mixed': 'Mixed',

    // Discount / tax editors
    'editor.saleDiscount': 'Sale discount',
    'editor.saleTax': 'Sale tax',
    'editor.noTaxesConfigured': 'No active taxes configured for this pharmacy.',
    'editor.cancel': 'Cancel',
    'editor.apply': 'Apply',
    'editor.saving': 'Saving…',

    // Icon rail
    'rail.discount': 'Discount',
    'rail.tax': 'Tax',
    'rail.cancel': 'Cancel',
    'rail.clear': 'Clear',

    // Toasts
    'toast.relativeAdded': '{name} added as a relative.',
    'toast.relativeAddFailed': 'Could not add relative.',
    'toast.availabilityFailed': 'Could not check availability.',
    'toast.noStock': 'No available stock for this medicine.',
    'toast.onlyAvailable': 'Only {available} units available.',
    'toast.noMatchingProduct': 'No matching product found.',
    'toast.discountNegative': 'Discount cannot be negative.',
    'toast.discountExceeds': 'Discount cannot exceed the sale subtotal.',
    'toast.discountApplied': 'Discount applied.',
    'toast.taxApplied': 'Tax applied.',
    'toast.saleCancelled': 'Sale cancelled.',
    'toast.cartCleared': 'Cart cleared.',
    'toast.assignCustomerItem': 'Assign a customer to this item before checking it.',
    'toast.assignCustomerCart': 'Assign a customer before checking the cart.',
    'toast.itemsSkipped': '{count} item(s) without a customer were skipped.',
    'toast.checkAllFirst': 'Run "Check all" on the cart before taking payment.',
    'toast.saleCompleted': 'Sale {invoiceNumber} completed successfully.',
    'toast.paymentFailed': 'Payment could not be completed.',
    'toast.customerFallback': 'Customer',
    'toast.loadCustomersFailed': 'Could not load customers.',
    'toast.loadRelativesFailed': 'Could not load relatives.',
    'toast.searchCustomersFailed': 'Could not search customers.',
    'toast.addItemFailed': 'Could not add item to cart.',
  },
  ar: {
    // Tabs
    'tabs.new': 'فاتورة جديدة',
    'tabs.newSale': 'فاتورة جديدة',
    'tabs.itemCount': '{count} صنف',
    'tabs.closeConfirm': 'إغلاق هذه الفاتورة؟ سيتم فقد السلة.',

    // Search
    'search.placeholder': 'ابحث بالاسم أو الباركود أو رمز الصنف…',
    'search.searching': 'جارٍ البحث…',
    'search.noResults': 'لا يوجد منتج مطابق.',
    'search.stock': 'المتوفر:',

    // Customer
    'customer.walkIn': 'عميل بدون تسجيل',

    // Cart
    'cart.title': 'السلة',
    'cart.itemsSuffix': 'صنف',
    'cart.emptyTitle': 'السلة فارغة',
    'cart.emptyDesc': 'ابحث بالباركود أو اسم المنتج لبدء عملية بيع.',
    'cart.checkTooltip': 'فحص {name} مع الملف الطبي لهذا العميل',
    'cart.relative': 'قريب',
    'cart.noRelative': 'بدون قريب',
    'cart.noRelativesHint': 'لا يوجد أقارب — اختر عميل أولاً.',
    'cart.discount': 'الخصم',
    'cart.tax': 'الضريبة',
    'cart.noTax': 'بدون ضريبة',

    // Order summary
    'summary.title': 'ملخص الفاتورة',
    'summary.subtotal': 'الإجمالي الفرعي',
    'summary.discount': 'الخصم',
    'summary.tax': 'الضريبة',
    'summary.grandTotal': 'الإجمالي الكلي',
    'summary.grandTotalMobile': 'الإجمالي الكلي',
    'summary.checkAll': 'افحص السلة قبل الدفع',
    'summary.checkingCart': 'جارٍ فحص السلة…',
    'summary.checkingShort': 'جارٍ الفحص…',
    'summary.checkedOk': 'تم فحص السلة — آمن للدفع',
    'summary.checkAllShort': 'افحص السلة',
    'summary.runCheckFirst': 'افحص السلة أولاً',
    'summary.pay': 'ادفع {amount}$',
    'summary.cash': 'نقدًا',
    'summary.card': 'بطاقة',
    'summary.mixed': 'مختلط',

    // Discount / tax editors
    'editor.saleDiscount': 'خصم الفاتورة',
    'editor.saleTax': 'ضريبة الفاتورة',
    'editor.noTaxesConfigured': 'لا توجد ضرائب مفعّلة لهذه الصيدلية.',
    'editor.cancel': 'إلغاء',
    'editor.apply': 'تطبيق',
    'editor.saving': 'جارٍ الحفظ…',

    // Icon rail
    'rail.discount': 'خصم',
    'rail.tax': 'ضريبة',
    'rail.cancel': 'إلغاء',
    'rail.clear': 'تفريغ',

    // Toasts
    'toast.relativeAdded': 'تمت إضافة {name} كقريب.',
    'toast.relativeAddFailed': 'تعذّرت إضافة القريب.',
    'toast.availabilityFailed': 'تعذّر التحقق من التوفر.',
    'toast.noStock': 'لا يوجد مخزون متاح لهذا الدواء.',
    'toast.onlyAvailable': 'المتاح فقط {available} وحدة.',
    'toast.noMatchingProduct': 'لا يوجد منتج مطابق.',
    'toast.discountNegative': 'لا يمكن أن يكون الخصم سالبًا.',
    'toast.discountExceeds': 'لا يمكن أن يتجاوز الخصم إجمالي الفاتورة الفرعي.',
    'toast.discountApplied': 'تم تطبيق الخصم.',
    'toast.taxApplied': 'تم تطبيق الضريبة.',
    'toast.saleCancelled': 'تم إلغاء الفاتورة.',
    'toast.cartCleared': 'تم تفريغ السلة.',
    'toast.assignCustomerItem': 'اختر عميلاً لهذا الصنف قبل فحصه.',
    'toast.assignCustomerCart': 'اختر عميلاً قبل فحص السلة.',
    'toast.itemsSkipped': 'تم تخطي {count} صنف بدون عميل محدد.',
    'toast.checkAllFirst': 'افحص السلة قبل إتمام الدفع.',
    'toast.saleCompleted': 'تم إتمام الفاتورة {invoiceNumber} بنجاح.',
    'toast.paymentFailed': 'تعذّر إتمام عملية الدفع.',
    'toast.customerFallback': 'عميل',
    'toast.loadCustomersFailed': 'تعذّر تحميل العملاء.',
    'toast.loadRelativesFailed': 'تعذّر تحميل الأقارب.',
    'toast.searchCustomersFailed': 'تعذّر البحث عن العملاء.',
    'toast.addItemFailed': 'تعذّرت إضافة الصنف إلى السلة.',
  },
};
