// Matches SaleStatsDto — GET /api/Sale/stats
export interface SaleStats {
  todayTotal: number;
  completedCount: number;
  cancelledCount: number;
  averageBasket: number;
}

// Matches SalesTrendPointDto — GET /api/Sale/trend?days=7
export interface SalesTrendPoint {
  date: string;
  dayLabel: string;
  total: number;
  orderCount: number;
}

// Matches CategoryMixDto — GET /api/Sale/category-mix
export interface CategoryMix {
  category: string;
  revenue: number;
  percentage: number;
}

// Matches AuditReadDto — GET /api/Audit/recent?take=6
export interface AuditEntry {
  date: string;
  action: string;
  entity: string;
  device: string;
  userFullName: string;
}

// Matches MedicineDto — GET /api/pharmacy-medicines
// NOTE: this endpoint returns a raw array, not wrapped in GeneralResult<T>.
export type StockStatus = 'InStock' | 'Low' | 'Out';

export interface PharmacyMedicineRow {
  id: string;
  pharmacyMedicineId: string;
  tradeNameEn: string;
  category: string;
  sku: string;
  availableQuantity: number;
  numberOfBatches: number;
  stockStatus: StockStatus;
}