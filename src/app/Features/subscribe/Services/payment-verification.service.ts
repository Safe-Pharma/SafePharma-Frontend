import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GeneralResult } from '../../../Core/Models/general-result.model';
import { PaymentInstructions } from '../Models/payment-instructions.model';
import { PaymentVerificationRead, SubmitPaymentProofRequest } from '../Models/payment-verification.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentVerificationService {
  private http = inject(HttpClient);
  private baseUrl(subscriptionId: string): string {
    return `${environment.apiUrl}/subscriptions/${subscriptionId}/payment`;
  }

  getInstructions(subscriptionId: string): Observable<GeneralResult<PaymentInstructions>> {
    return this.http.get<GeneralResult<PaymentInstructions>>(`${this.baseUrl(subscriptionId)}/instructions`);
  }

  // Step 1 — multipart upload, field name must be exactly "receipt" (backend reads IFormFile receipt)
  uploadReceipt(subscriptionId: string, file: File): Observable<GeneralResult<string>> {
    const formData = new FormData();
    formData.append('receipt', file);
    return this.http.post<GeneralResult<string>>(`${this.baseUrl(subscriptionId)}/proof/receipt`, formData);
  }

  // Step 2 — JSON body, referencing the ReceiptUrl returned by uploadReceipt()
  submitProof(
    subscriptionId: string,
    request: SubmitPaymentProofRequest,
  ): Observable<GeneralResult<PaymentVerificationRead>> {
    return this.http.post<GeneralResult<PaymentVerificationRead>>(`${this.baseUrl(subscriptionId)}/proof`, request);
  }

  getStatus(subscriptionId: string): Observable<GeneralResult<PaymentVerificationRead>> {
    return this.http.get<GeneralResult<PaymentVerificationRead>>(`${this.baseUrl(subscriptionId)}/status`);
  }
  
  getHistory(subscriptionId: string): Observable<GeneralResult<PaymentVerificationRead[]>> {
  return this.http.get<GeneralResult<PaymentVerificationRead[]>>(`${this.baseUrl(subscriptionId)}/history`);
}
}