import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMedicineDialog } from './add-medicine-dialog';

describe('AddMedicineDialog', () => {
  let component: AddMedicineDialog;
  let fixture: ComponentFixture<AddMedicineDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMedicineDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMedicineDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
