export type StockStatus = 'InStock' | 'Low' | 'Out';

export interface TaxSummary {
  id: string;
  name: string;
  rate: number;
}

// Matches MedicineDto — used for the list page
export interface Medicine {
  id: string;                 // global Medicine.Id — used in routing
  pharmacyMedicineId: string;
  tradeNameAr: string;
  tradeNameEn: string;
  scientificName: string;
  category: string;
  unitOfSale: string;
  unitsPerPackage: number;
  dosageForm: string;
  strength: string;
  sku: string;    
  pharmacyBarcodes: string[];            
  purchasePrice: number;
  sellingPrice: number;
  taxes: TaxSummary[];
  minStockLevel: number;
  isPrescriptionRequired: boolean;
  isControlled: boolean;
  manufacturer: string | null;
  countryOfOrigin: string | null;
  storageConditions: string | null;
  therapeuticCategory: string | null;
  isActive: boolean;
  changedAt: string;
  changedBy: string | null;
  availableQuantity: number;
  numberOfBatches: number;
  stockStatus: StockStatus;
}

// Matches MedicineStatsDto
export interface MedicineStats {
  totalMedicines: number;
  active: number;
  inactive: number;
  prescriptionRequired: number;
  controlled: number;
  categoriesCount: number;
  belowMinStock: number;
}

export interface InventorySummary {
  totalStock: number;
  availableQuantity: number;
  numberOfBatches: number;
  expiringSoon: number;
  stockStatus: StockStatus;
}

// Matches MedicineDetailsDto — used for the detail page
export interface MedicineDetails {
  id: string;
  tradeNameAr: string;
  tradeNameEn: string;
  scientificName: string;
  category: string;
  manufacturer: string | null;
  countryOfOrigin: string | null;
  therapeuticCategory: string | null;
  storageConditions: string | null;
  unitOfSale: string;
  unitsPerPackage: number;
  isPrescriptionRequired: boolean;
  isControlled: boolean;
  dosageForm: string;
  strength: string;
  isGlobalActive: boolean;

  pharmacyMedicineId: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  taxes: TaxSummary[];
  minStockLevel: number;
  isPharmacyActive: boolean;

  manufacturerBarcodes: string[];
  pharmacyBarcodes: string[];

  inventory: InventorySummary;
}
export interface GlobalMedicineSearchResult {
  id: string;
  tradeNameAr: string;
  tradeNameEn: string;
  scientificName: string;
  category: string;
  unitOfSale: string;
  unitsPerPackage: number;
  manufacturer: string | null;
  isAlreadyInPharmacy: boolean;
  dosageForm: string;
  strength: string;
  manufacturerBarcodes: string[];
}

// Fields needed to attach ANY medicine (new or existing) to this pharmacy
export interface PharmacyMedicineFields {
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  taxIds: string[];
  sKU?: string | null;
}

export interface LinkExistingMedicineDto extends PharmacyMedicineFields {
  medicineId: string;
}

export interface MedicineCreateDto extends PharmacyMedicineFields {
  tradeNameAr: string;
  tradeNameEn: string;
  scientificName: string;
  category: string;
  unitOfSale: string;
  unitsPerPackage: number;
  dosageForm: string;
  strength: string;
  isPrescriptionRequired: boolean;
  isControlled: boolean;
  manufacturer?: string | null;
  countryOfOrigin?: string | null;
  storageConditions?: string | null;
  therapeuticCategory?: string | null;
  isActive: boolean;
}
export interface AddManufacturerBarcodeDto {
  medicineId: string;
  barcode: string;
  isPrimary: boolean;
}

export interface AddPharmacyBarcodeDto {
  pharmacyMedicineId: string;
  barcode: string | null;
  isPrimary: boolean;
}
export interface PharmacyMedicineUpdateDto {
  taxIds: string[];
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  sKU?: string | null;
}