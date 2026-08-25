import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment.production';
import {
  CreateReferenceCatalogItemDto,
  ReferenceCatalogKey,
} from '../Models/reference-catalog.model';

interface GeneralResultResponse {
  success?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ReferenceCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  create(key: ReferenceCatalogKey, payload: CreateReferenceCatalogItemDto): Observable<void> {
    const endpoint = {
      chronicCondition: 'ChronicCondition',
      organ: 'Organ',
      allergy: 'Allergy',
    }[key];

    return this.http
      .post<GeneralResultResponse | null>(`${this.baseUrl}/${endpoint}`, payload)
      .pipe(
        map((response) => {
          if (response?.success === false) {
            throw new Error(response.message || 'Could not create reference item.');
          }
        }),
      );
  }
}
