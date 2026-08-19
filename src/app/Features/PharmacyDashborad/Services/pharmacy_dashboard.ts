import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GeneralResult } from '../../../Core/Models/general-result.model';
import { AuditEntry, CategoryMix, PharmacyMedicineRow, SalesTrendPoint, SaleStats } from '../Models/pharmacy_dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly saleApi = `${environment.apiUrl}/Sale`;
  private readonly auditApi = `${environment.apiUrl}/Audit`;
  private readonly medicinesApi = `${environment.apiUrl}/pharmacy-medicines`;

  getStats(): Observable<GeneralResult<SaleStats>> {
    return this.http.get<GeneralResult<SaleStats>>(`${this.saleApi}/stats`);
  }

  getTrend(days = 7): Observable<GeneralResult<SalesTrendPoint[]>> {
    return this.http.get<GeneralResult<SalesTrendPoint[]>>(`${this.saleApi}/trend`, {
      params: { days },
    });
  }

  getCategoryMix(): Observable<GeneralResult<CategoryMix[]>> {
    return this.http.get<GeneralResult<CategoryMix[]>>(`${this.saleApi}/category-mix`);
  }

  getRecentActivity(take = 6): Observable<GeneralResult<AuditEntry[]>> {
    return this.http.get<GeneralResult<AuditEntry[]>>(`${this.auditApi}/recent`, {
      params: { take },
    });
  }

  /** NOTE: unlike the other calls above, this endpoint returns a raw array —
   *  it is NOT wrapped in GeneralResult<T>. */
  getMedicines(): Observable<PharmacyMedicineRow[]> {
    return this.http.get<PharmacyMedicineRow[]>(this.medicinesApi);
  }
}