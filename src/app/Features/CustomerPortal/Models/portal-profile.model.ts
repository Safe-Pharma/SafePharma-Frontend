
export interface PortalProfileUpdateDto {
  name: string;
  email?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
}