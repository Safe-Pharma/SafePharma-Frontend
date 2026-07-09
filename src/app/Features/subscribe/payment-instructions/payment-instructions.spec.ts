import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentInstructions } from './payment-instructions';

describe('PaymentInstructions', () => {
  let component: PaymentInstructions;
  let fixture: ComponentFixture<PaymentInstructions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentInstructions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentInstructions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
