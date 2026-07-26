import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RelativesService {
  
  private BaseUrl = `https://localhost:7259/api/CustomerRelative/`;
  
  constructor(private http: HttpClient) {}

  getAllRelatives(id: string): Observable<any[]> {
    return this.http.get<any>(`${this.BaseUrl}${id}`).pipe(
      map(response => response.data) 
    );
  }
}