import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PosService {
  private medicineSearchApi = 'https://localhost:7259/api/MedicineSearch';
  private saleApi = 'https://localhost:7259/api/Sale';
  private customersApi = 'https://localhost:7259/api/Customers';

  constructor(private http: HttpClient) {}

  searchMedicines(query: string, pageNumber: number = 1, pageSize: number = 20) {
    return this.http.get(
      `${this.medicineSearchApi}/search?query=${query}&pageNumber=${pageNumber}&pageSize=${pageSize}`,
    );
  }

  createDraftSale() {
    return this.http.post(`${this.saleApi}`, {});
  }

  addItemToSale(saleId: string, dto: any) {
    return this.http.post(`${this.saleApi}/${saleId}/items`, dto);
  }

  updateSaleItem(saleId: string, itemId: string, dto: any) {
    return this.http.patch(`${this.saleApi}/${saleId}/items/${itemId}`, dto);
  }

  removeSaleItem(saleId: string, itemId: string) {
    return this.http.delete(`${this.saleApi}/${saleId}/items/${itemId}`);
  }

  getCustomers(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.http.get(`${this.customersApi}${q}`);
  }

  setSaleCustomer(saleId: string, dto: any) {
    return this.http.patch(`${this.saleApi}/${saleId}/customer`, dto);
  }
}
