export type PaymentMethod = 'Bank Transfer' | 'Cheque' | 'Cash' | 'Credit Card' | 'Other';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Bank Transfer',
  'Cheque',
  'Cash',
  'Credit Card',
  'Other',
];

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  paidAt: string; // ISO date string
}

export interface RecordSupplierPaymentDto {
  supplierId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  paidAt: string; // ISO date string
}