import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchDetails } from './batch-details';

describe('BatchDetails', () => {
  let component: BatchDetails;
  let fixture: ComponentFixture<BatchDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BatchDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
