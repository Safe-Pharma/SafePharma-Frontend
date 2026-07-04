import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserLanguage {
  private apiUrl = 'http://localhost:5257/api/UserLanguage';
  
  constructor(private http: HttpClient) {}

  getLanguage(): Observable<{ language: string }> {
    return this.http.get<{ language: string }>(this.apiUrl);
  }

  updateLanguage(language: string): Observable<any> {
    return this.http.put(this.apiUrl, { language });
  }
}
