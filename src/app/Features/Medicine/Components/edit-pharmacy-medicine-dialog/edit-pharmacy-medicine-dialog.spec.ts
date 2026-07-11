import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPharmacyMedicineDialog } from './edit-pharmacy-medicine-dialog';

describe('EditPharmacyMedicineDialog', () => {
  let component: EditPharmacyMedicineDialog;
  let fixture: ComponentFixture<EditPharmacyMedicineDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPharmacyMedicineDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPharmacyMedicineDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
