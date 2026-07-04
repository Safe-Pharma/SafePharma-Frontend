import { TestBed } from '@angular/core/testing';

import { UserLanguage } from './user-language';

describe('UserLanguage', () => {
  let service: UserLanguage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserLanguage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
