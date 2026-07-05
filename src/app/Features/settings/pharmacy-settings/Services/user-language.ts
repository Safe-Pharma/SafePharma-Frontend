import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserLanguage {
  private apiUrl = 'https://localhost:7259/api/UserLanguage';

  constructor(private http: HttpClient) {}

  getLanguage(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  updateLanguage(language: string): Observable<any> {
    return this.http.put(this.apiUrl, { language });
  }
}
