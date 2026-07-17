import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEditCustomerDialog } from './add-edit-customer-dialog';

describe('AddEditCustomerDialog', () => {
  let component: AddEditCustomerDialog;
  let fixture: ComponentFixture<AddEditCustomerDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEditCustomerDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddEditCustomerDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
