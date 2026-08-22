import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GeneralResult } from '../../../Core/Models/general-result.model';
import { PharmacyReadDto } from '../Models/pharmacy-read.dto';
import { environment } from '../../../../environments/environment.production';

type PharmacyCollectionResponse = PharmacyReadDto[] | GeneralResult<PharmacyReadDto[]>;

@Injectable({
  providedIn: 'root',
})
export class PharmacyService {
  private readonly baseUrl = `${environment.apiUrl}/Pharmacy`;

  constructor(private http: HttpClient) {}

  getAllPharmacies(): Observable<PharmacyReadDto[]> {
    return this.http.get<PharmacyCollectionResponse>(this.baseUrl).pipe(
      map((response): PharmacyReadDto[] => {
        if (Array.isArray(response)) {
          return response;
        }

        if (response.success === false) {
          throw new Error(response.message || 'Could not load pharmacies.');
        }

        if (!Array.isArray(response.data)) {
          throw new Error('The pharmacy response did not contain a data array.');
        }

        return response.data;
      }),
    );
  }

  updateActiveState(id: string, isActive: boolean): Observable<boolean> {
    const safeId = encodeURIComponent(id);
    return this.http
      .patch<
        PharmacyReadDto | { data?: PharmacyReadDto | null } | null
      >(`${this.baseUrl}/${safeId}/status`, { isActive })
      .pipe(
        map((response) => {
          if (response && 'data' in response) {
            return response.data?.isActive ?? isActive;
          }

          if (response && 'isActive' in response) {
            return response.isActive;
          }

          return isActive;
        }),
      );
  }
}
