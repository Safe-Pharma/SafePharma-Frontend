import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PharmacySettings {
  private apiUrl = 'http://localhost:5257/api/PharmacySettings';
  constructor(private http: HttpClient) {}

  getSettings(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  updateSettings(data: FormData): Observable<any> {
    return this.http.put(this.apiUrl, data);
  }
}
