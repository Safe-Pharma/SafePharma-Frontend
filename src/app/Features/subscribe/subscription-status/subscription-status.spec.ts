import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionStatus } from './subscription-status';

describe('SubscriptionStatus', () => {
  let component: SubscriptionStatus;
  let fixture: ComponentFixture<SubscriptionStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
