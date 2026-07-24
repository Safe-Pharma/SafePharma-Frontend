import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PortalSessionInfo,
  SendOtpRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../Models/portal-auth.model';

// Deliberately separate from Core/Services/auth-session.service.ts and uses its own
// localStorage key. A patient session and a staff (pharmacist) session are different
// identities and must never share a token slot — otherwise logging into one silently
// logs the other out.
const PORTAL_TOKEN_KEY = 'portal_token';

@Injectable({ providedIn: 'root' })
export class PortalAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Otp`;

  private readonly sessionState = signal<PortalSessionInfo | null>(null);

  readonly session = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  constructor() {
    this.syncFromStorage();
  }

  sendOtp(phone: string): Observable<void> {
    const body: SendOtpRequest = { phone };
    return this.http.post<void>(`${this.baseUrl}/request`, body);
  }

  verifyOtp(phone: string, code: string): Observable<VerifyOtpResponse> {
    const body: VerifyOtpRequest = { phone, code };
    return this.http
      .post<VerifyOtpResponse>(`${this.baseUrl}/verify`, body)
      .pipe(tap((res) => this.setToken(res.token)));
  }

  setToken(token: string): void {
    localStorage.setItem(PORTAL_TOKEN_KEY, token);
    this.syncFromStorage();
  }

  getToken(): string | null {
    return localStorage.getItem(PORTAL_TOKEN_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(PORTAL_TOKEN_KEY);
    this.sessionState.set(null);
  }

  ensureSession(): boolean {
    return this.syncFromStorage() !== null;
  }

  private syncFromStorage(): PortalSessionInfo | null {
    const token = this.getToken();

    if (!token) {
      this.sessionState.set(null);
      return null;
    }

    const info = this.decodeToken(token);

    if (!info) {
      this.clearToken();
      return null;
    }

    this.sessionState.set(info);
    return info;
  }

  private decodeToken(token: string): PortalSessionInfo | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;

      const payload = JSON.parse(this.base64UrlDecode(payloadPart)) as Record<string, unknown>;

      const customerId = this.firstString(payload, ['customerId', 'sub', 'nameid']);
      const name = this.firstString(payload, ['name', 'fullName']) ?? 'Patient';
      const phone = this.firstString(payload, ['phone', 'phone_number']) ?? '';

      if (!customerId) return null;

      return {
        customerId,
        name,
        phone,
        token,
        initials: this.buildInitials(name),
      };
    } catch {
      return null;
    }
  }

  private firstString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }

  private buildInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'P';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
}