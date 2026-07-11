import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderApiService {
  private api = `${environment.apiUrl}/PurchaseOrder`;
  private SupplierApi = `${environment.apiUrl}/Suppliers`;
  private MedicineApi = `${environment.apiUrl}/Medicines`;
  private PurchaseReceiptApi = `${environment.apiUrl}/PurchaseReceipt`;

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
  getPurchaseOrderById(id:string):Observable<any>{
  return this.http.get(`${this.api}/${id}`);
}

receivePurchaseOrder(id:string,data:any):Observable<any>{
  return this.http.post(
    `${this.PurchaseReceiptApi}/${id}`,
    data
  );
}



getReceipts(): Observable<any> {
    return this.http.get(this.PurchaseReceiptApi);
  }
  getReceiptById(id: string): Observable<any> {
    return this.http.get(`${this.PurchaseReceiptApi}/${id}`);
  }
}
