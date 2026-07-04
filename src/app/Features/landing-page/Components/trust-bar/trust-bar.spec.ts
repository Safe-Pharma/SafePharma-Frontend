import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustBar } from './trust-bar';

describe('TrustBar', () => {
  let component: TrustBar;
  let fixture: ComponentFixture<TrustBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
