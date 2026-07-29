// Matches the customer-scoped sales/receipts endpoints from the portal spec.
// Status may come back as either a readable name or a numeric/string code from the backend,
// and is normalized in the UI layer before rendering labels/badges.

export interface PortalSaleItem {
  medicineName: string;
  scientificName?: string | null;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

// Matches the list shape returned by GET /api/customer/{customerId}/sales
export interface PortalReceiptListItem {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  pharmacyName?: string | null;
  grandTotal: number;
  status: string | number;
  items: PortalSaleItem[];
}

// Detail view re-uses the list item shape plus the financial breakdown needed for the
// receipt screen. If the backend later exposes a dedicated /sales/{id} endpoint this can
// be split out — for now the detail is derived from the list item the user clicked.
export interface PortalReceiptDetail extends PortalReceiptListItem {
  paymentMethod?: string | null;
  tax: number;
  discount: number;
  subtotal: number;
  paidAmount: number;
}

export interface PortalReceiptFilters {
  search?: string;
  pharmacyName?: string;
  dateFrom?: string;
  dateTo?: string;
}
