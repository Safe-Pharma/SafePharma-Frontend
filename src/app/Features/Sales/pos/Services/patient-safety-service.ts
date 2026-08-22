import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GeneralResult } from '../../../../Core/Models/general-result.model';
import {
  PatientSafetyCheckRequest,
  PatientSafetyCheckResponseData,
} from '../Model/patient-safety.models';
import { environment } from '../../../../../environments/environment.production';

@Injectable({ providedIn: 'root' })
export class PatientSafetyService {
  private readonly api = `${environment.apiUrl}/PatientSafety`;

  constructor(private http: HttpClient) {}

  check(
    request: PatientSafetyCheckRequest,
  ): Observable<GeneralResult<PatientSafetyCheckResponseData>> {
    return this.http.post<GeneralResult<PatientSafetyCheckResponseData>>(
      `${this.api}/check`,
      request,
    );
  }
}
