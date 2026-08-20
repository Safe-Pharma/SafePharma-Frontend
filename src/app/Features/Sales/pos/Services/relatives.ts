import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { GeneralResult } from '../../../../Core/Models/general-result.model';
import { RelativeListItem } from '../Model/pos.models';

@Injectable({ providedIn: 'root' })
export class RelativesService {
  private readonly baseUrl = `${environment.apiUrl}/CustomerRelative`;

  constructor(private http: HttpClient) {}

  /** Relatives of the given customer — used to populate the per-row "Relative" dropdown. */
  getAllRelatives(customerId: string): Observable<RelativeListItem[]> {
    return this.http
      .get<GeneralResult<RelativeListItem[]>>(`${this.baseUrl}/${customerId}`)
      .pipe(map((res) => res.data ?? []));
  }
}