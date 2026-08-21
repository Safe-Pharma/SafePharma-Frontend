import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Customer,
  CustomerStats,
  CustomerUpsertDto,
  RecordCustomerPaymentDto,
  CustomerMedicineHistory,
  CreateCustomerMedicineHistoryDto,
  AddMedicineHistoryResponse,
  CatalogItem,
  GeneralResult,
  CustomerAllergy,
  AssignAllergyDto,
  CustomerChronicCondition,
  AssignChronicConditionDto,
  CustomerOrganFunction,
  AssignOrganFunctionDto,
  CustomerRelative,
  CreateCustomerRelativeDto,
} from '../Models/customer.model';
import { environment } from '../../../../environments/environment.production';

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customers`;
  // Separate controller (api/CustomerRelative), not nested under api/customers.
  private readonly relativeUrl = `${environment.apiUrl}/CustomerRelative`;

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
  ): Observable<AddMedicineHistoryResponse> {
    return this.http.post<AddMedicineHistoryResponse>(`${this.baseUrl}/${customerId}/medicine-history`, dto);
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

  // --- Allergies ---

  getAllergies(customerId: string): Observable<CustomerAllergy[]> {
    return this.http.get<CustomerAllergy[]>(`${this.baseUrl}/${customerId}/allergies`);
  }

  assignAllergy(customerId: string, dto: AssignAllergyDto): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${customerId}/allergies`, dto);
  }

  // Any pharmacist can remove — unlike Customer/medicine-history deletes, these
  // aren't Owner-restricted on the backend.
  removeAllergy(customerId: string, allergyId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${customerId}/allergies/${allergyId}`);
  }

  // --- Chronic conditions ---

  getChronicConditions(customerId: string): Observable<CustomerChronicCondition[]> {
    return this.http.get<CustomerChronicCondition[]>(`${this.baseUrl}/${customerId}/chronic-conditions`);
  }

  assignChronicCondition(customerId: string, dto: AssignChronicConditionDto): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${customerId}/chronic-conditions`, dto);
  }

  removeChronicCondition(customerId: string, chronicConditionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${customerId}/chronic-conditions/${chronicConditionId}`);
  }

  // --- Organ functions (one record per organ per customer — assigning again updates it) ---

  getOrganFunctions(customerId: string): Observable<CustomerOrganFunction[]> {
    return this.http.get<CustomerOrganFunction[]>(`${this.baseUrl}/${customerId}/organ-functions`);
  }

  assignOrganFunction(customerId: string, dto: AssignOrganFunctionDto): Observable<CustomerOrganFunction> {
    return this.http.post<CustomerOrganFunction>(`${this.baseUrl}/${customerId}/organ-functions`, dto);
  }

  removeOrganFunction(customerId: string, organFunctionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${customerId}/organ-functions/${organFunctionId}`);
  }

  // --- Reference catalogs (for dropdowns — separate controllers, wrapped in GeneralResult) ---

  getAllergyCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/allergy`)
      .pipe(map((r) => r.data));
  }

  getChronicConditionCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/chroniccondition`)
      .pipe(map((r) => r.data));
  }

  getOrganCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/organ`)
      .pipe(map((r) => r.data));
  }

  getOrganImpairmentLevelCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/organimpairmentlevel`)
      .pipe(map((r) => r.data));
  }
  // --- Relatives (separate controller: api/CustomerRelative) ---

  getRelatives(customerId: string): Observable<CustomerRelative[]> {
    return this.http
      .get<GeneralResult<CustomerRelative[]>>(`${this.relativeUrl}/${customerId}`)
      .pipe(map((r) => r.data));
  }

  addRelative(dto: CreateCustomerRelativeDto): Observable<GeneralResult<null>> {
    return this.http.post<GeneralResult<null>>(this.relativeUrl, dto);
  }

  removeRelative(relativeLinkId: string): Observable<GeneralResult<null>> {
    return this.http.delete<GeneralResult<null>>(`${this.relativeUrl}/${relativeLinkId}`);
  }
}