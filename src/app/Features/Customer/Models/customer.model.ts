export type CustomerStatus = 'Active' | 'Inactive';

// Matches CustomerDto
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: string | null;
  notes: string;
  status: CustomerStatus;
  // Paid AT THE CALLING PHARMACY only — Customer is shared across all pharmacies,
  // so this is never a platform-wide lifetime total.
  totalPaid: number;
}

// Matches CustomerStatsDto
export interface CustomerStats {
  totalCustomers: number;
  active: number;
  inactive: number;
  // Sum of this pharmacy's own CustomerPharmacyBalance rows only.
  totalPaidAllCustomers: number;
}

// Matches CustomerCreateDto / CustomerUpdateDto (same shape for both)
export interface CustomerUpsertDto {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  status: CustomerStatus;
}

// Matches RecordCustomerPaymentDto
export interface RecordCustomerPaymentDto {
  amount: number;
}

// Matches CustomerMedicineHistoryDto
export interface CustomerMedicineHistory {
  id: string;
  customerId: string;
  medicineId: string | null;
  isGlobalMatch: boolean;
  medicineName: string;
  scientificName: string;
  purchaseDate: string;
  quantity: number;
  isActive: boolean;
  notes: string;
}

// Matches CreateCustomerMedicineHistoryDto
// Exactly one of medicineId / scientificName is meant to drive the record:
// - medicineId set    -> picked from the global catalog
// - medicineId absent  -> scientificName is required (free-text, not in the catalog)
export interface CreateCustomerMedicineHistoryDto {
  medicineId?: string | null;
  scientificName?: string | null;
  purchaseDate?: string | null;
  quantity: number;
  isActive: boolean;
  notes?: string | null;
}