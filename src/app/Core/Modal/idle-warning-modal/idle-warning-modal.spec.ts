import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdleWarningModal } from './idle-warning-modal';

describe('IdleWarningModal', () => {
  let component: IdleWarningModal;
  let fixture: ComponentFixture<IdleWarningModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdleWarningModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdleWarningModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
