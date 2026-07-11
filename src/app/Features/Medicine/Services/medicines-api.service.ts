import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AddManufacturerBarcodeDto, AddPharmacyBarcodeDto, GlobalMedicineSearchResult, LinkExistingMedicineDto, Medicine, MedicineCreateDto, MedicineDetails, MedicineStats, PharmacyMedicineUpdateDto } from '../Models/medicine.model';
import { GeneralResult } from '../../../Core/Models/general-result.model';

@Injectable({ providedIn: 'root' })
export class MedicinesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pharmacy-medicines`;

  getAll(search?: string, category?: string, includeInactive = false): Observable<Medicine[]> {
    let params = new HttpParams().set('includeInactive', String(includeInactive));
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);
    return this.http.get<Medicine[]>(this.baseUrl, { params });
  }

  getStats(): Observable<MedicineStats> {
    return this.http.get<MedicineStats>(`${this.baseUrl}/stats`);
  }

  // id = global Medicine.Id
  getDetails(id: string): Observable<MedicineDetails> {
    return this.http.get<MedicineDetails>(`${this.baseUrl}/${id}/details`);
  }

  toggleStatus(id: string): Observable<Medicine> {
    return this.http.patch<Medicine>(`${this.baseUrl}/${id}/status`, {});
  }
  searchGlobal(query: string): Observable<GlobalMedicineSearchResult[]> {
  const params = new HttpParams().set('query', query);
  return this.http.get<GlobalMedicineSearchResult[]>(`${this.baseUrl}/catalog-search`, { params });
}

// Owner only — new medicine added to the shared global catalog
createGlobal(dto: MedicineCreateDto): Observable<Medicine> {
  return this.http.post<Medicine>(this.baseUrl, dto);
}

// Admin (or Owner) — new medicine scoped to this pharmacy only, never appears in global search
createLocal(dto: MedicineCreateDto): Observable<Medicine> {
  return this.http.post<Medicine>(`${this.baseUrl}/local`, dto);
}

// Attach an existing global medicine to this pharmacy with its own price/SKU/taxes
linkExisting(dto: LinkExistingMedicineDto): Observable<Medicine> {
  return this.http.post<Medicine>(`${this.baseUrl}/link-existing`, dto);
}

delete(id: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${id}`);
}

// BarcodeController uses [Route("api/[controller]")] -> case-sensitive "Barcode", not kebab-case
  private readonly barcodeUrl = `${environment.apiUrl}/Barcode`;

  addManufacturerBarcode(dto: AddManufacturerBarcodeDto): Observable<GeneralResult<null>> {
    return this.http.post<GeneralResult<null>>(`${this.barcodeUrl}/manufacturer`, dto);
  }

  addPharmacyBarcode(dto: AddPharmacyBarcodeDto): Observable<GeneralResult<null>> {
    return this.http.post<GeneralResult<null>>(`${this.barcodeUrl}/pharmacy`, dto);
  }

  updatePharmacyMedicine(id: string, dto: PharmacyMedicineUpdateDto): Observable<Medicine> {
  return this.http.put<Medicine>(`${this.baseUrl}/${id}`, dto);
}
}