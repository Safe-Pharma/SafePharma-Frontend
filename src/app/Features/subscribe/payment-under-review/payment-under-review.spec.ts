import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentUnderReview } from './payment-under-review';

describe('PaymentUnderReview', () => {
  let component: PaymentUnderReview;
  let fixture: ComponentFixture<PaymentUnderReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentUnderReview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentUnderReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
