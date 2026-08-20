// Matches SafePharma.API.Controllers.PatientSafetyController.CheckRequestDto and
// SafePharma.AI.Contracts.PatientSafetyResult / SafetyIssueDto / SuggestedAlternativeDto exactly.
// The endpoint accepts an array of patients (one call can check several customers
// at once, e.g. items on an invoice split across family members).

export interface SaleItemRef {
  pharmacyMedicineId: string;
  saleItemId: string;
}

export interface CheckPatientDto {
  customerId: string;
  items: SaleItemRef[];
}

export interface PatientSafetyCheckRequest {
  patients: CheckPatientDto[];
  language?: string;
}

export type SafetyIssueSeverity = 'Minor' | 'Moderate' | 'Major';
export type OverallDecision = 'Approve' | 'Warn' | 'Block';

export interface SafetyIssue {
  type: string;
  severity: SafetyIssueSeverity;
  reason: string;
  relatedDrugRefs: string[];
}

export interface SuggestedAlternative {
  drugName: string;
  reason: string | null;
}

export interface PatientSafetyResult {
  patientRef: string;
  checkSucceeded: boolean;
  failureReason: string | null;
  overallDecision: OverallDecision | null;
  riskScore: number | null;
  confidence: string | null;
  issues: SafetyIssue[];
  recommendation: string | null;
  suggestedAlternatives: SuggestedAlternative[];
  sources: string[];
}

export interface PatientSafetyCheckResponseData {
  results: PatientSafetyResult[];
}

/** The local cart lines included in a safety request. Keeping these beside
 * the response lets the POS render a result for the exact checked snapshot,
 * rather than treating a later cart as if it had already been checked. */
export interface SafetyCheckedMedicine {
  id: string;
  pharmacyMedicineId: string;
  medicineName: string;
  quantity: number;
  customerId: string | null;
}
