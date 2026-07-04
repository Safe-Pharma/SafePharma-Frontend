export type TaxStatus = 'Active' | 'Inactive';

export interface Tax {
  id: string;
  name: string;
  rate: number;
  status: TaxStatus;
}

export interface TaxStats {
  totalTaxes: number;
  active: number;
  inactive: number;
  averageRate: number;
}

export interface TaxCreateDto {
  name: string;
  rate: number;
  status: TaxStatus;
}

export interface TaxUpdateDto {
  name: string;
  rate: number;
  status: TaxStatus;
}
