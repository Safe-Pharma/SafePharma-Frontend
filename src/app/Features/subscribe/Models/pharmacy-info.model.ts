export interface PharmacyInfo {
  name: string;
  logoUrl: string | null;
  taxNumber: string | null;
  commercialRegistration: string | null;
  address: string;
  country: string;
  city: string;
  phone: string;
  businessEmail: string;
  numberOfBranches: number;
  preferredLanguage: string;
  timeZone: string;
}