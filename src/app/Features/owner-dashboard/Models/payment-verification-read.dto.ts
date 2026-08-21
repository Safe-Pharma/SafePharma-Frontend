/**
 * The list DTO exposed by the Owner payment-verification endpoints.
 * Keep the backend field names intact so the service does not silently
 * change the administrative review contract.
 */
export interface PaymentVerificationReadDto {
  id: string;
  subscriptionId: string;
  referenceCode: string;
  pharmacyName: string;
  planTier: string;
  billingCycle: string;
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;
  paidAmount: number;
  receiptUrl: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}
