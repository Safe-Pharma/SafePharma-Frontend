import { TestBed } from '@angular/core/testing';

import { MedicinesApiService } from './medicines-api.service';

describe('MedicinesApiService', () => {
  let service: MedicinesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MedicinesApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
