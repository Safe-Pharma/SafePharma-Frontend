import { PharmacyInfo } from './pharmacy-info.model';
import { PrimaryContactInfo } from './primary-contact-info.model';

export interface CreateSubscriptionRequest {
  planTier: 'Starter' | 'Professional' | 'Enterprise';
  billingCycle: 'monthly' | 'yearly';
  pharmacy: PharmacyInfo;
  primaryContact: PrimaryContactInfo;
}