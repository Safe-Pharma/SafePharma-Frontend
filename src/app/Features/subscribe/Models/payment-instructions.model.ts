export interface PaymentMethodField {
  label: string;
  value: string;
}

export interface PaymentMethodRead {
  id: string;
  methodName: string;
  isActive: boolean;
  sortOrder: number;
  fields: PaymentMethodField[];
}

export interface PaymentInstructions {
  subscriptionId: string;
  referenceCode: string;
  planTier: string;
  billingCycle: string;
  amountDue: number;
  currency: string;
  paymentMethods: PaymentMethodRead[];
}