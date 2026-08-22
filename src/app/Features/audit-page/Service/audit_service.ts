import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment.production';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private baseUrl = `${environment.apiUrl}/Audit/`;

  constructor(private http: HttpClient) {}

  getAllAudits(): Observable<any[]> {
    return this.http.get<any>(this.baseUrl).pipe(map((response) => response.data));
  }
}
