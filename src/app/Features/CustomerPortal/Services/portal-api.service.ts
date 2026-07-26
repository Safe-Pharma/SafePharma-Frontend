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

  getProfile(): Observable<Customer> {
    return this.http
      .get<GeneralResult<Customer>>(`${this.customerPortalUrl}/getMe`)
      .pipe(map((r) => r.data));
  }

  updateProfile(dto: PortalProfileUpdateDto): Observable<Customer> {
    return this.http.put<Customer>(
      `${this.customerPortalUrl}/editMe`,
      dto,
    );
  }

  // ============================================================
  // Medicine History
  // ============================================================

  getMedicineHistory(): Observable<CustomerMedicineHistory[]> {
    return this.http.get<CustomerMedicineHistory[]>(
      `${this.customerPortalUrl}/medicine-history`,
    );
  }

  // ============================================================
  // Allergies
  // ============================================================

  getAllergyCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(
        `${environment.apiUrl}/allergy`,
      )
      .pipe(map((r) => r.data));
  }

  getAllergies(): Observable<CustomerAllergy[]> {
    return this.http.get<CustomerAllergy[]>(
      `${this.customerPortalUrl}/GetMyAllergies`,
    );
  }

  assignAllergy(dto: AssignAllergyDto): Observable<void> {
    return this.http.post<void>(
      `${this.customerPortalUrl}/AddMyAllergies`,
      dto,
    );
  }

  removeAllergy(allergyId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.customerPortalUrl}/allergies/${allergyId}`,
    );
  }

  // ============================================================
  // Chronic Conditions
  // ============================================================

  getChronicConditionCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(
        `${environment.apiUrl}/chroniccondition`,
      )
      .pipe(map((r) => r.data));
  }

  getChronicConditions(): Observable<CustomerChronicCondition[]> {
    return this.http.get<CustomerChronicCondition[]>(
      `${this.customerPortalUrl}/chronic-conditions`,
    );
  }

  assignChronicCondition(
    dto: AssignChronicConditionDto,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.customerPortalUrl}/chronic-conditions`,
      dto,
    );
  }

  removeChronicCondition(
    chronicConditionId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.customerPortalUrl}/chronic-conditions/${chronicConditionId}`,
    );
  }

  // ============================================================
  // Organ Functions
  // ============================================================

  getOrganCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(
        `${environment.apiUrl}/organ`,
      )
      .pipe(map((r) => r.data));
  }

  getOrganImpairmentLevelCatalog(): Observable<CatalogItem[]> {
    return this.http
      .get<GeneralResult<CatalogItem[]>>(
        `${environment.apiUrl}/organimpairmentlevel`,
      )
      .pipe(map((r) => r.data));
  }

  getOrganFunctions(): Observable<CustomerOrganFunction[]> {
    return this.http.get<CustomerOrganFunction[]>(
      `${this.customerPortalUrl}/organ-functions`,
    );
  }

  assignOrganFunction(
    dto: AssignOrganFunctionDto,
  ): Observable<CustomerOrganFunction> {
    return this.http.post<CustomerOrganFunction>(
      `${this.customerPortalUrl}/organ-functions`,
      dto,
    );
  }

  removeOrganFunction(organFunctionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.customerPortalUrl}/organ-functions/${organFunctionId}`,
    );
  }

  // ============================================================
  // Purchase History
  // ============================================================

  getPurchaseHistory(): Observable<PortalReceiptListItem[]> {
    return this.http
      .get<GeneralResult<PortalReceiptListItem[]>>(
        `${this.customerPortalUrl}/sales`,
      )
      .pipe(map((r) => r.data));
  }

  getPurchaseDetails(saleId: string): Observable<any> {
    return this.http
      .get<GeneralResult<any>>(
        `${this.customerPortalUrl}/sales/${saleId}`,
      )
      .pipe(map((r) => r.data));
  }

  // ============================================================
  // Relatives
  // ============================================================

  getRelatives(): Observable<CustomerRelative[]> {
    return this.http
      .get<GeneralResult<CustomerRelative[]>>(
        `${this.customerPortalUrl}/MyRelatives`,
      )
      .pipe(map((r) => r.data));
  }
}