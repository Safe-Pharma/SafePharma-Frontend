import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, of, tap } from 'rxjs';

export interface PharmacySettingsData {
  name: string;
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
  private apiUrl = 'https://localhost:7259/api/PharmacySettings';
  readonly settings = signal<PharmacySettingsData | null>(null);
  readonly loading = signal(false);
  private loaded = false;
  private requestInFlight = false;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<any> {
    const cached = this.settings();
    if (cached) {
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
        });
        this.loaded = true;
      }),
    );
  }
}
