export type SupplierStatus = 'Active' | 'Inactive';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  address: string;
  country: string; 
  status: SupplierStatus;
  outstanding: number; 
}

export interface SupplierStats {
  totalSuppliers: number;
  active: number;
  inactive: number;
  countriesCount: number;
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