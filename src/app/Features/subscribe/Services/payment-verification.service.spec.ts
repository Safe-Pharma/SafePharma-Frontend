import { TestBed } from '@angular/core/testing';

import { PaymentVerificationService } from './payment-verification.service';

describe('PaymentVerificationService', () => {
  let service: PaymentVerificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentVerificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
