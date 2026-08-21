import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tax, TaxCreateDto, TaxStats, TaxUpdateDto } from '../Models/tax';
import { environment } from '../../../../environments/environment.production';

@Injectable({ providedIn: 'root' })
export class TaxesService {
  private readonly baseUrl = `${environment.apiUrl}/taxes`;

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<Tax[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Tax[]>(this.baseUrl, { params });
  }

  getStats(): Observable<TaxStats> {
    return this.http.get<TaxStats>(`${this.baseUrl}/stats`);
  }

  getById(id: string): Observable<Tax> {
    return this.http.get<Tax>(`${this.baseUrl}/${id}`);
  }

  create(dto: TaxCreateDto): Observable<Tax> {
    return this.http.post<Tax>(this.baseUrl, dto);
  }

  update(id: string, dto: TaxUpdateDto): Observable<Tax> {
    return this.http.put<Tax>(`${this.baseUrl}/${id}`, dto);
  }

  toggleStatus(id: string): Observable<Tax> {
    return this.http.patch<Tax>(`${this.baseUrl}/${id}/status`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
