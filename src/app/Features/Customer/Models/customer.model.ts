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
  hasParent: boolean;
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

// Response shape of POST .../medicine-history — wasUpdated is true when this medicine
// already existed for the customer and the existing record was reactivated/updated
// instead of a new one being created (see backend AddMedicineHistory dedup logic).
export interface AddMedicineHistoryResponse {
  history: CustomerMedicineHistory;
  wasUpdated: boolean;
}

// Matches CreateCustomerMedicineHistoryDto
export interface CreateCustomerMedicineHistoryDto {
  medicineId?: string | null;
  tradeName?: string | null;
  scientificName?: string | null;
  purchaseDate?: string | null;
  quantity: number;
  isActive: boolean;
  notes?: string | null;
}

// Shared shape for the Allergy / ChronicCondition / Organ / OrganImpairmentLevel
export interface CatalogItem {
  id: string;
  nameEn: string;
  nameAr: string;
}

// Those catalog endpoints wrap their response in GeneralResult<T> (Success/Message/Data),
export interface GeneralResult<T> {
  success: boolean;
  message: string;
  data: T;
}

// Matches CustomerAllergyDto
export interface CustomerAllergy {
  allergyId: string;
  nameEn: string;
  nameAr: string;
}

// Matches AssignAllergyDto
export interface AssignAllergyDto {
  allergyId: string;
}

// Matches CustomerChronicConditionDto
export interface CustomerChronicCondition {
  chronicConditionId: string;
  nameEn: string;
  nameAr: string;
}

// Matches AssignChronicConditionDto
export interface AssignChronicConditionDto {
  chronicConditionId: string;
}

// Matches CustomerOrganFunctionDto
export interface CustomerOrganFunction {
  id: string;
  organId: string;
  organNameEn: string;
  organNameAr: string;
  organImpairmentLevelId: string;
  impairmentLevelNameEn: string;
  impairmentLevelNameAr: string;
  recordedAt: string;
}

// Matches CustomerRelativeReadDto
export interface CustomerRelative {
  id: string;
  
  relativeId: string;
  relativeName: string;
  relativePhone: string;
}

// Matches CustomerRelativeCreateDto
export interface CreateCustomerRelativeDto {
  customerId: string;
  relativeId: string;
  hasAccessToRelative: boolean;
  isChild?: boolean;
}

// Matches AssignOrganFunctionDto
export interface AssignOrganFunctionDto {
  organId: string;
  organImpairmentLevelId: string;
}
