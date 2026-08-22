export type SalePaymentMethod = 'Cash' | 'Card' | 'Mixed';

export enum SaleStatus {
  Open = 0,
  Cancelled = 1,
  Completed = 2,
}
export interface RelativeListItem {
  relativeId: string;
  relativeName: string;
}
export interface MedicineSearchResult {
  pharmacyMedicineId: string;
  tradeNameAr: string;
  tradeNameEn: string;
  scientificName: string;
  barcode: string | null;
  purchasePrice?: number;
  sellingPrice: number;
  stockQuantity: number;
}

export interface PaginationMetaData {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PagedResult<T> {
  items: T[];
  metadata: PaginationMetaData;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  status?: 'Active' | 'Inactive';
  isActive?: boolean;
}

export interface SaleItem {
  id: string;
  pharmacyMedicineId: string;
  medicineName: string;
  customerId: string | null;
  customerName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  paymentMethod: SalePaymentMethod;
  subTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountPaidByCash: number;
  amountPaidByCard: number;
  amountPaid: number;
  change: number;
  status: SaleStatus;
  items: SaleItem[];
  createdAt: string;
}

// ---- Request DTOs (match the backend exactly — no batchId, it's FIFO-resolved server-side) ----

export interface CreateSaleItemsDto {
  pharmacyMedicineId: string;
  customerId?: string;
  quantity: number;
  discount: number;
  taxAmount: number;
}

export interface UpdateSaleItemDto {
  customerId?: string;
  quantity: number;
  discount: number;
  taxAmount: number;
}

export interface ApplySaleDiscountDto {
  discountAmount: number;
}

export interface ApplySaleTaxDto {
  taxId: string;
}

export interface ApplySaleTaxDto {
  taxId: string;
}

export interface SetSaleCustomerDto {
  customerId: string;
}

/** What the payment modal collects, before it's translated into a PaySaleDto. */
export type PaymentMethodChoice = 'Cash' | 'Card' | 'Mixed';

// Matches PaySaleDto — only these two fields are read by the backend.
export interface PaySaleDto {
  amountPaidByCash: number;
  amountPaidByCard: number;
}

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export interface SaleStats {
  todayTotal: number;
  completedCount: number;
  averageBasket: number;
  cancelledCount: number;
}

// ---- Local-cart checkout (the cart lives entirely on the frontend/localStorage
// until the pharmacist actually pays — nothing is created in the database
// before that moment). See pos.ts for the local cart model itself. ----

export interface StockAvailability {
  availableQuantity: number;
  unitPrice: number;
}

export interface CheckoutItemDto {
  pharmacyMedicineId: string;
  customerId?: string;
  quantity: number;
  discount: number;
  taxAmount: number;
}

export interface CheckoutDto {
  customerId?: string;
  items: CheckoutItemDto[];
  discountAmount: number;
  taxId?: string;
  amountPaidByCash: number;
  amountPaidByCard: number;
}

export interface BarcodeScanData {
  medicineId: string;
  pharmacyMedicineId: string;
  medicineName: string;
  price: number;
  barcodeSource: string;
}
