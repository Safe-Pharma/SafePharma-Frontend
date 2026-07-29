import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

import {
  AssignAllergyDto,
  AssignChronicConditionDto,
  AssignOrganFunctionDto,
  CatalogItem,
  Customer,
  CustomerAllergy,
  CustomerChronicCondition,
  CustomerMedicineHistory,
  CustomerOrganFunction,
  CustomerRelative,
  GeneralResult,
} from '../../Customer/Models/customer.model';

import { PortalProfileUpdateDto } from '../Models/portal-profile.model';
import { PortalReceiptListItem } from '../Models/portal-sales.model';

@Injectable({
  providedIn: 'root',
})
export class PortalApiService {
  private readonly http = inject(HttpClient);

  private readonly customerPortalUrl = `${environment.apiUrl}/CustomerPortal`;

  // ============================================================
  // Profile
  // ============================================================

  getProfile(customerId?: string): Observable<Customer> {
    const url = customerId
      ? `${environment.apiUrl}/customers/${customerId}`
      : `${this.customerPortalUrl}/getMe`;

    return this.http
      .get<GeneralResult<Customer> | Customer>(url)
      .pipe(map((response) => this.unwrapData<Customer>(response)));
  }

  getDependentProfile(childId: string): Observable<Customer> {
    return this.http
      .get<GeneralResult<Customer> | Customer>(`${this.customerPortalUrl}/dependents/${childId}`)
      .pipe(map((response) => this.unwrapData<Customer>(response)));
  }

  updateProfile(dto: PortalProfileUpdateDto, childId?: string): Observable<Customer> {
    const url = childId
      ? `${this.customerPortalUrl}/eiteDependents/${childId}`
      : `${this.customerPortalUrl}/editMe`;

    return this.http.put<Customer>(url, dto);
  }

  // ============================================================
  // Medicine History
  // ============================================================

  getMedicineHistory(customerId?: string): Observable<CustomerMedicineHistory[]> {
    const url = customerId
      ? `${environment.apiUrl}/customers/${customerId}/medicine-history`
      : `${this.customerPortalUrl}/medicine-history`;

    return this.http.get<CustomerMedicineHistory[]>(url);
  }

  getDependentMedicineHistory(childId: string): Observable<CustomerMedicineHistory[]> {
    return this.http.get<CustomerMedicineHistory[]>(
      `${this.customerPortalUrl}/dependents/medicine-history/${childId}`,
    );
  }

  // ============================================================
  // Allergies
  // ============================================================

  getAllergyCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/allergy`)
      .pipe(map((r) => r.data));
  }

  getAllergies(customerId?: string): Observable<CustomerAllergy[]> {
    const url = customerId
      ? `${environment.apiUrl}/customers/${customerId}/allergies`
      : `${this.customerPortalUrl}/GetMyAllergies`;

    return this.http.get<CustomerAllergy[]>(url);
  }

  getDependentAllergies(childId: string): Observable<CustomerAllergy[]> {
    return this.http.get<CustomerAllergy[]>(
      `${this.customerPortalUrl}/dependents/GetMyAllergies/${childId}`,
    );
  }

  assignAllergy(dto: AssignAllergyDto): Observable<void> {
    return this.http.post<void>(`${this.customerPortalUrl}/AddMyAllergies`, dto);
  }

  assignDependentAllergy(childId: string, dto: AssignAllergyDto): Observable<void> {
    return this.http.post<void>(
      `${this.customerPortalUrl}/dependents/AddMyAllergies/${childId}`,
      dto,
    );
  }

  removeAllergy(allergyId: string): Observable<void> {
    return this.http.delete<void>(`${this.customerPortalUrl}/allergies/${allergyId}`);
  }

  removeDependentAllergy(childId: string, allergyId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.customerPortalUrl}/dependents/allergies/${childId}/${allergyId}`,
    );
  }

  // ============================================================
  // Chronic Conditions
  // ============================================================

  getChronicConditionCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/chroniccondition`)
      .pipe(map((r) => r.data));
  }

  getChronicConditions(customerId?: string): Observable<CustomerChronicCondition[]> {
    const url = customerId
      ? `${environment.apiUrl}/customers/${customerId}/chronic-conditions`
      : `${this.customerPortalUrl}/chronic-conditions`;

    return this.http.get<CustomerChronicCondition[]>(url);
  }

  getDependentChronicConditions(childId: string): Observable<CustomerChronicCondition[]> {
    return this.http.get<CustomerChronicCondition[]>(
      `${this.customerPortalUrl}/dependents/chronic-conditions/${childId}`,
    );
  }

  assignChronicCondition(dto: AssignChronicConditionDto): Observable<void> {
    return this.http.post<void>(`${this.customerPortalUrl}/chronic-conditions`, dto);
  }

  assignDependentChronicCondition(
    childId: string,
    dto: AssignChronicConditionDto,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.customerPortalUrl}/dependents/chronic-conditions/${childId}`,
      dto,
    );
  }

  removeChronicCondition(chronicConditionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.customerPortalUrl}/chronic-conditions/${chronicConditionId}`,
    );
  }

  removeDependentChronicCondition(childId: string, chronicConditionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.customerPortalUrl}/dependents/chronic-conditions/${childId}/${chronicConditionId}`,
    );
  }

  // ============================================================
  // Organ Functions
  // ============================================================

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

  getOrganFunctions(customerId?: string): Observable<CustomerOrganFunction[]> {
    const url = customerId
      ? `${environment.apiUrl}/customers/${customerId}/organ-functions`
      : `${this.customerPortalUrl}/organ-functions`;

    return this.http.get<CustomerOrganFunction[]>(url);
  }

  getDependentOrganFunctions(childId: string): Observable<CustomerOrganFunction[]> {
    return this.http.get<CustomerOrganFunction[]>(
      `${this.customerPortalUrl}/dependents/organ-functions/${childId}`,
    );
  }

  assignOrganFunction(dto: AssignOrganFunctionDto): Observable<CustomerOrganFunction> {
    return this.http.post<CustomerOrganFunction>(`${this.customerPortalUrl}/organ-functions`, dto);
  }

  assignDependentOrganFunction(
    childId: string,
    dto: AssignOrganFunctionDto,
  ): Observable<CustomerOrganFunction> {
    return this.http.post<CustomerOrganFunction>(
      `${this.customerPortalUrl}/dependents/organ-functions/${childId}`,
      dto,
    );
  }

  removeOrganFunction(organFunctionId: string): Observable<void> {
    return this.http.delete<void>(`${this.customerPortalUrl}/organ-functions/${organFunctionId}`);
  }

  removeDependentOrganFunction(childId: string, organFunctionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.customerPortalUrl}/dependents/organ-functions/${childId}/${organFunctionId}`,
    );
  }

  // ============================================================
  // Purchase History
  // ============================================================

  getPurchaseHistory(customerId?: string): Observable<PortalReceiptListItem[]> {
    const url = customerId
      ? `${this.customerPortalUrl}/dependents/sales/${customerId}`
      : `${this.customerPortalUrl}/sales`;

    return this.http.get<GeneralResult<PortalReceiptListItem[]>>(url).pipe(map((r) => r.data));
  }

  getPurchaseDetails(saleId: string, customerId?: string): Observable<any> {
    const url = customerId
      ? `${this.customerPortalUrl}/dependents/sales/${customerId}/${saleId}`
      : `${this.customerPortalUrl}/sales/${saleId}`;

    return this.http.get<GeneralResult<any>>(url).pipe(map((r) => r.data));
  }

  // ============================================================
  // Relatives
  // ============================================================

  getRelatives(): Observable<CustomerRelative[]> {
    return this.http
      .get<GeneralResult<CustomerRelative[]>>(`${this.customerPortalUrl}/MyRelatives`)
      .pipe(map((r) => r.data));
  }

  getDependentRelatives(childId: string): Observable<CustomerRelative[]> {
    return this.http
      .get<
        GeneralResult<CustomerRelative[]>
      >(`${this.customerPortalUrl}/dependents/MyRelatives/${childId}`)
      .pipe(map((r) => r.data));
  }

  getChilds(customerId: string): Observable<CustomerRelative[]> {
    return this.http
      .get<
        GeneralResult<CustomerRelative[]> | CustomerRelative[]
      >(`${environment.apiUrl}/CustomerRelative/getChilds/${customerId}`)
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          const data = response?.data;
          return Array.isArray(data) ? data : [];
        }),
      );
  }

  getCustomerById(customerId: string): Observable<Customer> {
    return this.http
      .get<GeneralResult<Customer> | Customer>(`${environment.apiUrl}/customers/${customerId}`)
      .pipe(map((response) => this.unwrapData<Customer>(response)));
  }

  private unwrapData<T>(response: GeneralResult<T> | T): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as GeneralResult<T>).data as T;
    }

    return response as T;
  }
}
