import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GeneralResult } from '../../../Core/Models/general-result.model';
import { PaymentVerificationReadDto } from '../Models/payment-verification-read.dto';

type PaymentVerificationCollectionResponse =
  | PaymentVerificationReadDto[]
  | GeneralResult<PaymentVerificationReadDto[]>;

@Injectable({
  providedIn: 'root',
})
export class PaymentVerificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/payment-verifications`;

  getPaymentVerifications(): Observable<PaymentVerificationReadDto[]> {
    return this.getCollection(this.baseUrl);
  }

  getPendingPaymentVerifications(): Observable<PaymentVerificationReadDto[]> {
    return this.getCollection(`${this.baseUrl}/pending`);
  }

  approvePaymentVerification(id: string): Observable<GeneralResult<unknown>> {
    return this.http
      .post<GeneralResult<unknown>>(`${this.baseUrl}/${encodeURIComponent(id)}/approve`, null)
      .pipe(map((response) => this.ensureSuccess(response)));
  }

  rejectPaymentVerification(
    id: string,
    payload: { rejectionReason: string },
  ): Observable<GeneralResult<unknown>> {
    return this.http
      .post<GeneralResult<unknown>>(`${this.baseUrl}/${encodeURIComponent(id)}/reject`, payload)
      .pipe(map((response) => this.ensureSuccess(response)));
  }

  private getCollection(url: string): Observable<PaymentVerificationReadDto[]> {
    return this.http.get<PaymentVerificationCollectionResponse>(url).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }

        if (response.success === false) {
          throw new Error(response.message || 'Could not load payment verifications.');
        }

        if (!Array.isArray(response.data)) {
          throw new Error('The payment-verification response did not contain a data array.');
        }

        return response.data;
      }),
    );
  }

  private ensureSuccess(response: GeneralResult<unknown>): GeneralResult<unknown> {
    if (response?.success === false) {
      throw new Error(response.message || 'Payment verification action failed.');
    }

    return response;
  }
}
