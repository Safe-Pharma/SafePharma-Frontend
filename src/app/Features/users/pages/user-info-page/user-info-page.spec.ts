import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserInfoPage } from './user-info-page';

describe('UserInfoPage', () => {
  let component: UserInfoPage;
  let fixture: ComponentFixture<UserInfoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserInfoPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserInfoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
