import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from './auth-session.service';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: AuthSessionService,
          useValue: { isAuthenticated: () => true },
        },
      ],
    });

    service = TestBed.inject(I18nService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the language field required by UserLanguage', () => {
    service.setUserLanguage('ar');

    const request = httpMock.expectOne(`${environment.apiUrl}/UserLanguage`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ language: 'ar' });
    request.flush({});
  });
});
