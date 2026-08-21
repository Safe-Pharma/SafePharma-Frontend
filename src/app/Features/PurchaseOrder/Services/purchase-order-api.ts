import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.production';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderApiService {
  private api = `${environment.apiUrl}/PurchaseOrder`;
  private SupplierApi = `${environment.apiUrl}/Suppliers`;
  private PharmacyMedicineApi = `${environment.apiUrl}/pharmacy-medicines`;
  private PurchaseReceiptApi = `${environment.apiUrl}/PurchaseReceipt`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.api);
  }
  getSuppliers(): Observable<any> {
    return this.http.get(this.SupplierApi);
  }
  getMedicines(): Observable<any> {
    return this.http.get(this.PharmacyMedicineApi);
  }
  getReceiptHistory(): Observable<any> {
    return this.http.get(this.PurchaseReceiptApi);
  }
  addPurchaseOrder(data: any): Observable<any> {
    return this.http.post(this.api, data);
  }
  getPurchaseOrderById(id: string): Observable<any> {
    return this.http.get(`${this.api}/${id}`);
  }
  receivePurchaseOrder(id: string, data: any): Observable<any> {
    return this.http.post(`${this.PurchaseReceiptApi}/${id}`, data);
  }
  updateReceiptItem(id: string, data: any) {
    return this.http.put(`${this.PurchaseReceiptApi}/item/${id}`, data);
  }
}

export { PurchaseOrderApiService as PurchaseOrderApi };
