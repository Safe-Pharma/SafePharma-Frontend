export interface SubscriptionPlanRead {
  id: string;
  tier: 'Starter' | 'Professional' | 'Enterprise';
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}