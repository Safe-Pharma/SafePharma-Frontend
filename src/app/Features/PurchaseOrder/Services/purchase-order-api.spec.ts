import { TestBed } from '@angular/core/testing';

import { PurchaseOrderApi } from './purchase-order-api';

describe('PurchaseOrderApi', () => {
  let service: PurchaseOrderApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PurchaseOrderApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
