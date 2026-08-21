import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);

    // The service starts its unread-count poll when it is created.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    httpMock.expectOne(`${environment.apiUrl}/Notification/unread-count`).flush({
      data: { count: 1 },
    });
  });

  afterEach(() => httpMock.verify());

  it('loads notifications from the documented controller route', () => {
    service.getAllNotifications().subscribe(response => {
      expect(response.data).toEqual([]);
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/Notification`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], success: true, message: '', errors: null });
  });

  it('uses the documented unread-count, read, and read-all routes', () => {
    service.getUnreadCount().subscribe(response => expect(response.data?.count).toBe(3));
    const countRequest = httpMock.expectOne(`${environment.apiUrl}/Notification/unread-count`);
    expect(countRequest.request.method).toBe('GET');
    countRequest.flush({ data: { count: 3 } });

    service.markAsRead('notification-id').subscribe();
    const readRequest = httpMock.expectOne(
      `${environment.apiUrl}/Notification/notification-id/read`,
    );
    expect(readRequest.request.method).toBe('PATCH');
    readRequest.flush({ data: true, success: true });

    service.markAllAsRead().subscribe();
    const readAllRequest = httpMock.expectOne(`${environment.apiUrl}/Notification/read-all`);
    expect(readAllRequest.request.method).toBe('PATCH');
    readAllRequest.flush({ data: true, success: true });
  });
});
