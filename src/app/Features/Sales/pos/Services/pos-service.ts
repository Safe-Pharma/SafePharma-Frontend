import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GeneralResult } from '../../../../Core/Models/general-result.model';
import {
  ApplySaleDiscountDto,
  ApplySaleTaxDto,
  BarcodeScanData,
  CheckoutDto,
  Customer,
  CreateSaleItemsDto,
  MedicineSearchResult,
  PagedResult,
  PaySaleDto,
  Sale,
  SetSaleCustomerDto,
  StockAvailability,
  UpdateSaleItemDto,
} from '../Model/pos.models';
import { environment } from '../../../../../environments/environment.production';

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly medicineSearchApi = `${environment.apiUrl}/MedicineSearch`;
  private readonly barcodeApi = `${environment.apiUrl}/Barcode`;
  private readonly saleApi = `${environment.apiUrl}/Sale`;
  private readonly customersApi = `${environment.apiUrl}/Customers`;

  constructor(private http: HttpClient) {}

  scanBarcode(barcode: string): Observable<GeneralResult<BarcodeScanData>> {
    return this.http.post<GeneralResult<BarcodeScanData>>(`${this.barcodeApi}/scan`, { barcode });
  }

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

  /** Used on app start to restore previously-open tabs (see pos.ts persistTabs). */
  getSaleById(saleId: string): Observable<GeneralResult<Sale>> {
    return this.http.get<GeneralResult<Sale>>(`${this.saleApi}/${saleId}`);
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

  applyTax(saleId: string, dto: ApplySaleTaxDto): Observable<GeneralResult<Sale>> {
    return this.http.patch<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/tax`, dto);
  }

  pay(saleId: string, dto: PaySaleDto): Observable<GeneralResult<Sale>> {
    return this.http.post<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/pay`, dto);
  }

  cancelSale(saleId: string): Observable<GeneralResult<Sale>> {
    return this.http.post<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/cancel`, {});
  }

  /** Hard-deletes an untouched Open draft (used when the X button on an empty
   *  POS tab is clicked) — actually removes the row, unlike cancelSale which
   *  just marks it Cancelled. Only works on the backend while status is Open. */
  deleteDraftSale(saleId: string): Observable<GeneralResult<null>> {
    return this.http.delete<GeneralResult<null>>(`${this.saleApi}/${saleId}`);
  }

  setSaleCustomer(saleId: string, dto: SetSaleCustomerDto): Observable<GeneralResult<Sale>> {
    return this.http.patch<GeneralResult<Sale>>(`${this.saleApi}/${saleId}/customer`, dto);
  }

  getAllCustomers(search?: string): Observable<Customer[]> {
      let params = new HttpParams();
      if (search) params = params.set('search', search);
      return this.http.get<Customer[]>(this.customersApi , { params });
    }

  /** Read-only stock/price preview for a medicine, used while the cart is
   *  still purely local — never touches Sales/SaleItems. */
  getAvailability(pharmacyMedicineId: string): Observable<GeneralResult<StockAvailability>> {
    return this.http.get<GeneralResult<StockAvailability>>(
      `${this.saleApi}/availability/${pharmacyMedicineId}`,
    );
  }

  /** Submits the whole local cart at once: creates the Sale, adds every item,
   *  applies discount/tax, and records payment — the only point at which the
   *  cart actually touches the database. */
  checkout(dto: CheckoutDto): Observable<GeneralResult<Sale>> {
    return this.http.post<GeneralResult<Sale>>(`${this.saleApi}/checkout`, dto);
  }
}
