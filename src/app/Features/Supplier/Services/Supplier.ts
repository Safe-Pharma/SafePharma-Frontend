import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Supplier,
  SupplierCreateDto,
  SupplierStats,
  SupplierUpdateDto,
} from '../Models/Supplier';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly baseUrl = `${environment.apiUrl}/suppliers`;

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<Supplier[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Supplier[]>(this.baseUrl, { params });
  }

  getStats(): Observable<SupplierStats> {
    return this.http.get<SupplierStats>(`${this.baseUrl}/stats`);
  }

  getById(id: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.baseUrl}/${id}`);
  }

  create(dto: SupplierCreateDto): Observable<Supplier> {
    return this.http.post<Supplier>(this.baseUrl, dto);
  }

  update(id: string, dto: SupplierUpdateDto): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.baseUrl}/${id}`, dto);
  }

  toggleStatus(id: string): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.baseUrl}/${id}/status`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}