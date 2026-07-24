// The patient can edit everything on their Customer record EXCEPT phone and status —
// those two are pharmacy/administrative concerns, not the patient's to change from the
// portal. `status` still has to round-trip to satisfy the shared CustomerUpsertDto shape
// on the backend, so the form component reads it from the loaded profile and sends it
// back unchanged; it is never rendered as an editable field.
import { CustomerStatus } from '../../Customer/Models/customer.model';

export interface PortalProfileUpdateDto {
  name: string;
  email?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  // Passed through unchanged — see note above.
  status: CustomerStatus;
}