import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBarcodeDialog } from './add-barcode-dialog';

describe('AddBarcodeDialog', () => {
  let component: AddBarcodeDialog;
  let fixture: ComponentFixture<AddBarcodeDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddBarcodeDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddBarcodeDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
