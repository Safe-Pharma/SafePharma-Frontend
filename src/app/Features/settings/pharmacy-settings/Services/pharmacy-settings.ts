import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, of, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment.production';

export interface PharmacySettingsData {
  name: string;
  /** Tenant-wide default. It is intentionally separate from a user's personal override. */
  preferredLanguage?: string | null;
  defaultLanguage?: string | null;
  language?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  taxRegistrationNumber?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PharmacySettings {
  private apiUrl = `${environment.apiUrl}/PharmacySettings`;
  readonly settings = signal<PharmacySettingsData | null>(null);
  readonly loading = signal(false);
  /** Undefined means there is no unsaved logo preview; null means the draft removed it. */
  readonly logoPreview = signal<string | null | undefined>(undefined);
  private loaded = false;
  private requestInFlight = false;

  constructor(private http: HttpClient) {}

  getSettings(forceRefresh = false): Observable<any> {
    const cached = this.settings();
    if (cached && !forceRefresh) {
      this.loaded = true;
      return of({ data: cached });
    }

    this.loading.set(true);
    this.requestInFlight = true;
    return this.http.get(this.apiUrl).pipe(
      tap((response: any) => {
        const data = response?.data ?? response;
        if (data) this.settings.set(data as PharmacySettingsData);
        this.loaded = true;
      }),
      finalize(() => {
        this.loading.set(false);
        this.requestInFlight = false;
      }),
    );
  }

  setLogoPreview(url: string | null): void {
    this.logoPreview.set(url);
  }

  clearLogoPreview(): void {
    this.logoPreview.set(undefined);
  }

  ensureLoaded(): void {
    if (this.loaded || this.requestInFlight) return;
    this.getSettings().subscribe({
      error: () => {
        this.loading.set(false);
        this.requestInFlight = false;
      },
    });
  }

  updateSettings(data: FormData): Observable<any> {
    return this.http.put(this.apiUrl, data).pipe(
      tap((response: any) => {
        const responseData = response?.data ?? response;
        const name = data.get('Name');
        const current = this.settings() ?? {} as PharmacySettingsData;
        this.settings.set({
          ...current,
          ...(responseData && typeof responseData === 'object' ? responseData : {}),
          ...(typeof name === 'string' ? { name } : {}),
          ...(typeof data.get('PreferredLanguage') === 'string'
            ? { preferredLanguage: data.get('PreferredLanguage') as string }
            : {}),
        });
        this.loaded = true;
      }),
    );
  }
}
