import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitPaymentProof } from './submit-payment-proof';

describe('SubmitPaymentProof', () => {
  let component: SubmitPaymentProof;
  let fixture: ComponentFixture<SubmitPaymentProof>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitPaymentProof]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitPaymentProof);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
