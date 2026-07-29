import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PortalApiService } from './portal-api.service';
import { environment } from '../../../../environments/environment';

describe('PortalApiService', () => {
  let service: PortalApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(PortalApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request the dependent profile endpoint for child navigation', () => {
    const childId = 'child-123';
    const response = { data: { id: childId, name: 'Child Name' } };

    service.getDependentProfile(childId).subscribe((customer) => {
      expect(customer.name).toBe('Child Name');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/CustomerPortal/dependents/${childId}`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
