export type PaymentVerificationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface SubmitPaymentProofRequest {
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;   // ISO date string
  paidAmount: number;
  receiptUrl: string;    // returned by uploadReceipt()
}

export interface PaymentVerificationRead {
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
  status: PaymentVerificationStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}