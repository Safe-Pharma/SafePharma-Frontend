import { Injectable, inject, signal } from '@angular/core';
import { UsersApiService, RoleDto } from './users-api.service';

@Injectable({ providedIn: 'root' })
export class RolesStateService {
  private readonly api = inject(UsersApiService);

  readonly roles   = signal<RoleDto[]>([]);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  private loaded = false;

  /** Call this once on app init or on first component that needs roles. */
  load(): void {
    if (this.loaded) return; // already fetched — don't hit the API again
    this.loaded = true;
    this.loading.set(true);

    this.api.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load roles.');
        this.loading.set(false);
        this.loaded = false; // allow retry
      },
    });
  }
}