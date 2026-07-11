import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicineDetails } from './medicine-details';

describe('MedicineDetails', () => {
  let component: MedicineDetails;
  let fixture: ComponentFixture<MedicineDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicineDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicineDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
