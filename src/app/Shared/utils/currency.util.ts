export type CurrencyLocale = 'en' | 'ar';

/**
 * Formats a backend monetary amount for the current business currency.
 * This is display-only; it never converts the supplied value.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  locale: CurrencyLocale = 'en',
): string {
  if (value === null || value === undefined || value === '') return '—';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';

  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} EGP`;
}
