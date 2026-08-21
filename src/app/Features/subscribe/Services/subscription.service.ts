import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GeneralResult } from '../../../Core/Models/general-result.model';
import { CreateSubscriptionRequest } from '../Models/create-subscription.model';
import { SubscriptionReadResponse } from '../Models/subscription-read.model';
import { environment } from '../../../../environments/environment.production';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/subscription`;

  create(request: CreateSubscriptionRequest): Observable<GeneralResult<SubscriptionReadResponse>> {
    return this.http.post<GeneralResult<SubscriptionReadResponse>>(this.baseUrl, request);
  }
  uploadLogo(file: File): Observable<GeneralResult<string>> {
  const formData = new FormData();
  formData.append('logo', file);
  return this.http.post<GeneralResult<string>>(`${this.baseUrl}/logo`, formData);
}
}
