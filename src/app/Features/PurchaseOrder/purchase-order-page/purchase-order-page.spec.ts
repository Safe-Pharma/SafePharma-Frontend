import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderPage } from './purchase-order-page';

describe('PurchaseOrderPage', () => {
  let component: PurchaseOrderPage;
  let fixture: ComponentFixture<PurchaseOrderPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
