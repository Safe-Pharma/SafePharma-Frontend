import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Customer,
  CustomerStats,
  CustomerUpsertDto,
  RecordCustomerPaymentDto,
  CustomerMedicineHistory,
  CreateCustomerMedicineHistoryDto,
} from '../Models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customers`;

  // --- Customer (global — shared across all pharmacies) ---

  getAll(search?: string): Observable<Customer[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<Customer[]>(this.baseUrl, { params });
  }

  getStats(): Observable<CustomerStats> {
    return this.http.get<CustomerStats>(`${this.baseUrl}/stats`);
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  create(dto: CustomerUpsertDto): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, dto);
  }

  update(id: string, dto: CustomerUpsertDto): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseUrl}/${id}`, dto);
  }

  toggleStatus(id: string): Observable<Customer> {
    return this.http.patch<Customer>(`${this.baseUrl}/${id}/status`, {});
  }

  // Owner only — backend enforces this too; UI hides the action for non-owners.
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Records a payment from this customer AT THIS PHARMACY. Any pharmacist can do this.
  recordPayment(id: string, dto: RecordCustomerPaymentDto): Observable<Customer> {
    return this.http.post<Customer>(`${this.baseUrl}/${id}/payments`, dto);
  }

  // --- Medicine history (global — linked to the Medicine catalog, or free-text) ---

  getMedicineHistory(customerId: string, isActive?: boolean): Observable<CustomerMedicineHistory[]> {
    let params = new HttpParams();
    if (isActive !== undefined) params = params.set('isActive', String(isActive));
    return this.http.get<CustomerMedicineHistory[]>(`${this.baseUrl}/${customerId}/medicine-history`, { params });
  }

  addMedicineHistory(
    customerId: string,
    dto: CreateCustomerMedicineHistoryDto,
  ): Observable<CustomerMedicineHistory> {
    return this.http.post<CustomerMedicineHistory>(`${this.baseUrl}/${customerId}/medicine-history`, dto);
  }

  toggleMedicineActive(customerId: string, historyId: string): Observable<CustomerMedicineHistory> {
    return this.http.patch<CustomerMedicineHistory>(
      `${this.baseUrl}/${customerId}/medicine-history/${historyId}/toggle-active`,
      {},
    );
  }

  // Owner only — backend enforces this too; UI hides the action for non-owners.
  deleteMedicineHistory(customerId: string, historyId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${customerId}/medicine-history/${historyId}`);
  }
}