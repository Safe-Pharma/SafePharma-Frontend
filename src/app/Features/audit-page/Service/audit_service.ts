import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  
  private BaseUrl = `https://localhost:7259/api/Audit/`;
  
  constructor(private http: HttpClient) {}

  getAllAudits(): Observable<any[]> {
    return this.http.get<any>(this.BaseUrl).pipe(
      map(response => response.data) 
    );
  }
}