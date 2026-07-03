import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PharmacySettings } from './pharmacy-settings';

describe('PharmacySettings', () => {
  let component: PharmacySettings;
  let fixture: ComponentFixture<PharmacySettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PharmacySettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PharmacySettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
