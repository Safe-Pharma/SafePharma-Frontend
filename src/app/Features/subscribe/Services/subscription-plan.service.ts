import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SubscriptionPlanRead } from '../Models/subscription-plan.model';
import { environment } from '../../../../environments/environment.production';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionPlanService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/subscription-plans`;

  getActivePlans(): Observable<SubscriptionPlanRead[]> {
    return this.http.get<SubscriptionPlanRead[]>(this.baseUrl);
  }
}