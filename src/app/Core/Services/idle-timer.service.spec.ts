import { TestBed } from '@angular/core/testing';

import { IdleTimerService } from './idle-timer.service';

describe('IdleTimerService', () => {
  let service: IdleTimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IdleTimerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
