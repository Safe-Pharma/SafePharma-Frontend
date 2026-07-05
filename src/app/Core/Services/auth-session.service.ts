import { computed, Injectable, signal } from '@angular/core';

export interface AuthUserInfo {
  fullName: string;
  role: string;
  email?: string;
  initials: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly userState = signal<AuthUserInfo | null>(null);

  readonly user = computed(() => this.userState());
  readonly isAuthenticated = computed(() => this.userState() !== null);

  constructor() {
    this.syncFromStorage();
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
    this.syncFromStorage();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  clearToken(): void {
    localStorage.removeItem('token');
    this.userState.set(null);
  }

  syncFromStorage(): AuthUserInfo | null {
    const token = this.getToken();

    if (!token) {
      this.userState.set(null);
      return null;
    }

    const user = this.decodeToken(token);

    if (!user) {
      this.clearToken();
      return null;
    }

    this.userState.set(user);
    return user;
  }

  ensureSession(): boolean {
    return this.syncFromStorage() !== null;
  }

  private decodeToken(token: string): AuthUserInfo | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;

      const payload = JSON.parse(this.base64UrlDecode(payloadPart)) as Record<string, unknown>;
      const fullName =
        this.firstString(payload, [
          'fullName',
          'name',
          'unique_name',
          'given_name',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        ]) ?? 'User';

      const role =
        this.firstString(payload, [
          'role',
          'roles',
          'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
        ]) ?? 'User';

      const email = this.firstString(payload, [
        'email',
        'sub',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      ]);

      return {
        fullName,
        role,
        email: email ?? undefined,
        token,
        initials: this.buildInitials(fullName, email),
      };
    } catch {
      return null;
    }
  }

  private firstString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value)) {
        const firstValue = value.find(item => typeof item === 'string' && item.trim());
        if (typeof firstValue === 'string') {
          return firstValue.trim();
        }
      }
    }

    return null;
  }

  private buildInitials(fullName: string, email?: string | null): string {
    const source = fullName || email || 'User';
    const parts = source
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);
  }
}