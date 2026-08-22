import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SupplierPayment,
  RecordSupplierPaymentDto,   } from '../Models/Supplier-payment';
import { environment } from '../../../../environments/environment.production';

@Injectable({ providedIn: 'root' })
export class SupplierPaymentsService {
  private readonly baseUrl = `${environment.apiUrl}/supplier-payments`;

  constructor(private http: HttpClient) {}

  getHistory(): Observable<SupplierPayment[]> {
    return this.http.get<SupplierPayment[]>(this.baseUrl);
  }

  record(dto: RecordSupplierPaymentDto): Observable<SupplierPayment> {
    return this.http.post<SupplierPayment>(this.baseUrl, dto);
  }

}