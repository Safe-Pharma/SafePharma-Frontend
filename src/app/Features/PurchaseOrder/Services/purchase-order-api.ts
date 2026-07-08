import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderApiService {
  private api = `https://localhost:7259/api/PurchaseOrder`;
  private SupplierApi = `https://localhost:7259/api/Suppliers`;
  private MedicineApi = `https://localhost:7259/api/Medicines`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.api);
  }
  getSuppliers(): Observable<any> {
    return this.http.get(this.SupplierApi);
  }
  getMedicines(): Observable<any> {
    return this.http.get(this.MedicineApi);
  }
  addPurchaseOrder(data: any): Observable<any> {
    return this.http.post(this.api, data);
  }
}
