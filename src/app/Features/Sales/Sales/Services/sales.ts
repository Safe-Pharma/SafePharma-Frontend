import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Sale, SaleStats, SaleStatus } from '../../pos/Model/pos.models';
import { GeneralResult } from '../../../../Core/Models/general-result.model';
import { environment } from '../../../../../environments/environment.production';


@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Sale`;

  getAll(search?: string, status?: SaleStatus | null): Observable<GeneralResult<Sale[]>> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status !== undefined && status !== null) params = params.set('status', status);
    return this.http.get<GeneralResult<Sale[]>>(this.baseUrl, { params });
  }

  getById(saleId: string): Observable<GeneralResult<Sale>> {
    return this.http.get<GeneralResult<Sale>>(`${this.baseUrl}/${saleId}`);
  }

  getStats(): Observable<GeneralResult<SaleStats>> {
    return this.http.get<GeneralResult<SaleStats>>(`${this.baseUrl}/stats`);
  }
}
