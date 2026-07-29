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

  it('should send child profile updates to the child-specific endpoint', () => {
    const childId = 'child-456';
    const payload = {
      name: 'Child Name',
      email: 'child@example.com',
      address: '123 Main St',
      dateOfBirth: '2010-01-01',
      notes: 'Updated',
    };

    service.updateProfile(payload, childId).subscribe((customer) => {
      expect(customer.name).toBe('Child Name');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/CustomerPortal/dependents/${childId}`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: childId, name: 'Child Name' });
  });
});
