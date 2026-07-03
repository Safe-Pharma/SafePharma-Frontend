import { TestBed } from '@angular/core/testing';

import { PharmacySettings } from './pharmacy-settings';

describe('PharmacySettings', () => {
  let service: PharmacySettings;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PharmacySettings);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
