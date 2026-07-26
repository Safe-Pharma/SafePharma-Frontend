import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SessionScopeService } from '../../../Core/Services/session-scope.service';
import {
  OtpEnvelope,
  PortalSessionInfo,
  SendOtpRequest,
  VerifyOtpData,
  VerifyOtpRequest,
} from '../Models/portal-auth.model';

// Deliberately separate from Core/Services/auth-session.service.ts and uses its own
// localStorage key. A patient session and a staff (pharmacist) session are different
// identities and must never share a token slot — otherwise logging into one silently
// logs the other out.
const PORTAL_TOKEN_KEY = 'portal_token';

@Injectable({ providedIn: 'root' })
export class PortalAuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionScope = inject(SessionScopeService);
  private readonly baseUrl = `${environment.apiUrl}/Otp`;

  private readonly sessionState = signal<PortalSessionInfo | null>(null);

  readonly session = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  constructor() {
    this.syncFromStorage();
  }

  sendOtp(phone: string): Observable<OtpEnvelope<null>> {
    const body: SendOtpRequest = { phone };
    return this.http.post<OtpEnvelope<null>>(`${this.baseUrl}/request`, body);
  }

  verifyOtp(phone: string, code: string): Observable<OtpEnvelope<VerifyOtpData>> {
    const body: VerifyOtpRequest = { phone, code };
    return this.http.post<OtpEnvelope<VerifyOtpData>>(`${this.baseUrl}/verify`, body).pipe(
      tap((res) => {
        if (res.success && res.data?.accessToken) {
          this.setToken(res.data.accessToken);
        }
      }),
    );
  }

  setToken(token: string): void {
    // A portal login means this browser is now "patient" — any lingering staff session
    // must not stay valid alongside it.
    this.sessionScope.activatePortalSession();
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

  // The JWT has no `name` claim — only nameidentifier/Phone/role. Call this once the real
  // Customer profile has loaded so the sidebar/topbar can show an actual name instead of
  // just the phone number.
  updateDisplayName(name: string): void {
    const current = this.sessionState();
    if (!current || !name.trim()) return;
    this.sessionState.set({
      ...current,
      name: name.trim(),
      initials: this.buildInitials(name.trim()),
    });
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

      // This backend issues standard ClaimsIdentity-style JWTs, so the customer id rides on
      // the long XML-Soap "nameidentifier" URI rather than a short "sub"/"customerId" key.
      // Keep the short forms as fallbacks in case a future token shape is simpler.
      const customerId = this.firstString(payload, [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        'customerId',
        'sub',
        'nameid',
      ]);
      const phone = this.firstString(payload, ['Phone', 'phone', 'phone_number']) ?? '';
      // The backend now issues a "Name" claim (capital N) alongside Phone/role. Object
      // key lookups are case-sensitive in JS, so this must match exactly — this was
      // previously missing and silently fell back to showing the phone number instead.
      const name =
        this.firstString(payload, ['Name', 'name', 'fullName']) ?? phone ?? 'Patient';

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