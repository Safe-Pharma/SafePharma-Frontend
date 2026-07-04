import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturesGrid } from './features-grid';

describe('FeaturesGrid', () => {
  let component: FeaturesGrid;
  let fixture: ComponentFixture<FeaturesGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturesGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturesGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
