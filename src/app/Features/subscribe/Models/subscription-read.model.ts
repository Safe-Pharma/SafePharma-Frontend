export interface SubscriptionReadResponse {
  id: string;
  planTier: string;
  billingCycle: string;
  status: string;
  createdAt: string;
  pharmacyId: string;
  pharmacyName: string;
  primaryContactEmail: string;
}