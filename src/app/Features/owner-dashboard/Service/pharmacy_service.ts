import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PharmacyReadDto } from '../Models/pharmacy-read.dto';
import { environment } from '../../../../environments/environment.production';

@Injectable({
  providedIn: 'root',
})
export class PharmacyService {
  private readonly baseUrl = `${environment.apiUrl}/Pharmacy`;

  constructor(private http: HttpClient) {}

  getAllPharmacies(): Observable<PharmacyReadDto[]> {
    return this.http.get<PharmacyReadDto[] | { data?: PharmacyReadDto[] }>(this.baseUrl).pipe(
      map((response): PharmacyReadDto[] => {
        if (Array.isArray(response)) {
          return response;
        }

        return response.data ?? [];
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
