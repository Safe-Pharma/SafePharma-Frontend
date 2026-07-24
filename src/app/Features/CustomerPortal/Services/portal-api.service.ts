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

// Deliberately calls the SAME endpoints CustomersApiService uses (Features/Customer) rather
// than a duplicate patient-only API — a patient's medical record is the same record a
// pharmacist sees, just scoped to "myself" instead of an arbitrary :id, and authorized by
// a patient JWT instead of a staff JWT. Keeping one source of truth avoids the two surfaces
// drifting apart. Only the sales/relatives calls hit endpoints unique to the portal.
@Injectable({ providedIn: 'root' })
export class PortalApiService {
  private readonly http = inject(HttpClient);
  private readonly customersUrl = `${environment.apiUrl}/customers`;
  private readonly relativeUrl = `${environment.apiUrl}/CustomerRelative`;
  private readonly salesUrl = `${environment.apiUrl}/customer`; // NOTE: singular, per portal spec

  // --- Personal profile ---

  getProfile(customerId: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.customersUrl}/${customerId}`);
  }

  updateProfile(customerId: string, dto: PortalProfileUpdateDto): Observable<Customer> {
    return this.http.put<Customer>(`${this.customersUrl}/${customerId}`, dto);
  }

  // --- Medicine history (read-only for the patient) ---

  getMedicineHistory(customerId: string): Observable<CustomerMedicineHistory[]> {
    return this.http.get<CustomerMedicineHistory[]>(
      `${this.customersUrl}/${customerId}/medicine-history`,
    );
  }

  // --- Allergies ---

  getAllergyCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/allergy`)
      .pipe(map((r) => r.data));
  }

  getAllergies(customerId: string): Observable<CustomerAllergy[]> {
    return this.http.get<CustomerAllergy[]>(`${this.customersUrl}/${customerId}/allergies`);
  }

  assignAllergy(customerId: string, dto: AssignAllergyDto): Observable<void> {
    return this.http.post<void>(`${this.customersUrl}/${customerId}/allergies`, dto);
  }

  removeAllergy(customerId: string, allergyId: string): Observable<void> {
    return this.http.delete<void>(`${this.customersUrl}/${customerId}/allergies/${allergyId}`);
  }

  // --- Chronic conditions ---

  getChronicConditionCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(`${environment.apiUrl}/chroniccondition`)
      .pipe(map((r) => r.data));
  }

  getChronicConditions(customerId: string): Observable<CustomerChronicCondition[]> {
    return this.http.get<CustomerChronicCondition[]>(
      `${this.customersUrl}/${customerId}/chronic-conditions`,
    );
  }

  assignChronicCondition(customerId: string, dto: AssignChronicConditionDto): Observable<void> {
    return this.http.post<void>(`${this.customersUrl}/${customerId}/chronic-conditions`, dto);
  }

  removeChronicCondition(customerId: string, chronicConditionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.customersUrl}/${customerId}/chronic-conditions/${chronicConditionId}`,
    );
  }

  // --- Organ functions ---

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

  getOrganFunctions(customerId: string): Observable<CustomerOrganFunction[]> {
    return this.http.get<CustomerOrganFunction[]>(
      `${this.customersUrl}/${customerId}/organ-functions`,
    );
  }

  assignOrganFunction(
    customerId: string,
    dto: AssignOrganFunctionDto,
  ): Observable<CustomerOrganFunction> {
    return this.http.post<CustomerOrganFunction>(
      `${this.customersUrl}/${customerId}/organ-functions`,
      dto,
    );
  }

  // --- Purchase history (aggregated across all pharmacies the customer bought from) ---

  getPurchaseHistory(customerId: string): Observable<PortalReceiptListItem[]> {
    return this.http.get<PortalReceiptListItem[]>(`${this.salesUrl}/${customerId}/sales`);
  }

  // --- Relatives (read-only for the patient) ---

  getRelatives(customerId: string): Observable<CustomerRelative[]> {
    return this.http
      .get<GeneralResult<CustomerRelative[]>>(`${this.relativeUrl}/${customerId}`)
      .pipe(map((r) => r.data));
  }
}