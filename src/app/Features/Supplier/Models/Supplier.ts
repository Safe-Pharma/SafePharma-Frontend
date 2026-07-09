export type SupplierStatus = 'Active' | 'Inactive';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  address: string;
  country: string; // country name, resolved server-side from countryId
  status: SupplierStatus;
  outstanding: number; // current outstanding balance
}

export interface SupplierStats {
  totalSuppliers: number;
  active: number;
  inactive: number;
  countriesCount: number;
  paymentsRecorded: number;
}

export interface SupplierCreateDto {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber?: string;
  address: string;
  countryId: string;
  status: SupplierStatus;
  outstanding: number;
}

export interface SupplierUpdateDto {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber?: string;
  address: string;
  countryId: string;
  status: SupplierStatus;
  outstanding: number;
}