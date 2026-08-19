export interface PharmacyReadDto {
  id: string;
  name: string;
  commercialRegistration: string | null;
  address: string;
  country: string;
  city: string;
  phone: string;
  businessEmail: string;
  isActive: boolean;
}
