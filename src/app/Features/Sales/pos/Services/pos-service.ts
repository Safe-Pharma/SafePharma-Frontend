import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { GeneralResult } from '../../../../Core/Models/general-result.model';
import {
  ApplySaleDiscountDto,
  Customer,
  CreateSaleItemsDto,
  MedicineSearchResult,
  PagedResult,
  PaySaleDto,
  Sale,
  SetSaleCustomerDto,
  UpdateSaleItemDto,
} from '../pos.models';

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly medicineSearchApi = `${environment.apiUrl}/MedicineSearch`;
  private readonly saleApi = `${environment.apiUrl}/Sale`;
  private readonly customersApi = `${environment.apiUrl}/Customers`;

  constructor(private http: HttpClient) {}

  searchMedicines(
    query: string,
    pageNumber = 1,
    pageSize = 20,
  ): Observable<GeneralResult<PagedResult<MedicineSearchResult>>> {
    const params = new HttpParams()
      .set('query', query)
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    return this.http.get<GeneralResult<PagedResult<MedicineSearchResult>>>(
      `${this.medicineSearchApi}/search`,
      { params },
    );
  }

  createDraftSale(): Observable<GeneralResult<Sale>> {
    return this.http.post<GeneralResult<Sale>>(this.saleApi, {});
  }

  addItemToSale(saleId: string, dto: CreateSaleItemsDto): Observable<GeneralResult<Sale>> {
    return this.http.post<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/items`, dto);
  }

  updateSaleItem(
    saleId: string,
    itemId: string,
    dto: UpdateSaleItemDto,
  ): Observable<GeneralResult<Sale>> {
    return this.http.patch<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/items/${itemId}`, dto);
  }

  removeSaleItem(saleId: string, itemId: string): Observable<GeneralResult<Sale>> {
    return this.http.delete<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/items/${itemId}`);
  }

  applyDiscount(saleId: string, dto: ApplySaleDiscountDto): Observable<GeneralResult<Sale>> {
    return this.http.patch<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/discount`, dto);
  }

  pay(saleId: string, dto: PaySaleDto): Observable<GeneralResult<Sale>> {
    return this.http.post<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/pay`, dto);
  }

  cancelSale(saleId: string): Observable<GeneralResult<Sale>> {
    return this.http.post<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/cancel`, {});
  }

  setSaleCustomer(saleId: string, dto: SetSaleCustomerDto): Observable<GeneralResult<Sale>> {
    return this.http.patch<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/customer`, dto);
  }

  getCustomers(search?: string): Observable<GeneralResult<Customer[]>> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<GeneralResult<Customer[]>>(this.customersApi, { params });
  }
}
