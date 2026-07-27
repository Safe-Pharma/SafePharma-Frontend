import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, tap, catchError, of, Observable } from 'rxjs';
import { User, PaginationMetadata } from '../models/user.model';
import { UserActivity } from '../models/activity.model';
import { UserFormValue } from '../models/user-form.model';
import { UserQueryParams } from '../models/user-query-params.model';
import { UsersApiService } from './users-api.service';
import { getMockActivities } from './mock-activities';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(UsersApiService);

  // ── filter / pagination state ────────────────────────────────────────────
  readonly searchTerm   = signal('');
  readonly roleFilter   = signal<string>('');
  readonly statusFilter = signal<'All' | 'Active' | 'Inactive'>('All');
  readonly page         = signal(1);
  readonly pageSize     = signal(8);

  // ── server response state ────────────────────────────────────────────────
  readonly users     = signal<User[]>([]);
  readonly metadata  = signal<PaginationMetadata>({
    currentPage: 1,
    pageSize: 8,
    totalCount: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  readonly isLoading = signal(false);
  readonly error     = signal<string | null>(null);

  // ── derived ──────────────────────────────────────────────────────────────
  readonly totalCount = computed(() => this.metadata().totalCount);
  readonly totalPages = computed(() => this.metadata().totalPages);
  readonly hasNext    = computed(() => this.metadata().hasNext);
  readonly hasPrev    = computed(() => this.metadata().hasPrev);
  readonly rangeStart = computed(() => {
    const m = this.metadata();
    return m.totalCount === 0 ? 0 : (m.currentPage - 1) * m.pageSize + 1;
  });
  readonly rangeEnd = computed(() => {
    const m = this.metadata();
    return Math.min(m.currentPage * m.pageSize, m.totalCount);
  });

  // ── load trigger ─────────────────────────────────────────────────────────
  private readonly load$ = new Subject<void>();

  constructor() {
    this.load$
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.api.getUsers(this.buildParams()).pipe(
            catchError((err) => {
              this.error.set(err?.error?.message ?? 'Failed to load users.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.isLoading.set(false);
        if (result) {
          this.users.set(result.items);
          this.metadata.set(result.metadata);
        }
      });

    this.load$.next();
  }

  // ── filter / page actions ─────────────────────────────────────────────────

  loadUsers(): void { this.load$.next(); }

  setSearch(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
    this.load$.next();
  }

  setRoleFilter(role: string): void {
    this.roleFilter.set(role);
    this.page.set(1);
    this.load$.next();
  }

  setStatusFilter(status: 'All' | 'Active' | 'Inactive'): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.load$.next();
  }

  nextPage(): void {
    if (this.hasNext()) { this.page.update((p) => p + 1); this.load$.next(); }
  }

  prevPage(): void {
    if (this.hasPrev()) { this.page.update((p) => p - 1); this.load$.next(); }
  }

  // ── mutations — return Observable so dialogs get errors + know when done ──

  /**
   * Dialogs call this instead of UsersApiService directly.
   * On success: reloads the list automatically.
   * On error: re-throws so the dialog can show the backend errors.
   */
  createUser(value: UserFormValue): Observable<User> {
    return new Observable((observer) => {
      this.api.createUser(this.toCreateRequest(value)).subscribe({
        next: (user) => {
          this.load$.next();       // ← reload list
          observer.next(user);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }

  updateUser(id: string, value: UserFormValue): Observable<User> {
    return new Observable((observer) => {
      this.api.updateUser(id, this.toUpdateRequest(value)).subscribe({
        next: (user) => {
          this.load$.next();       // ← reload list
          observer.next(user);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }

  deleteUser(id: string): void {
    this.api.deleteUser(id).subscribe({
      next: () => this.load$.next(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to deactivate user.'),
    });
  }

  toggleUserStatus(user: User): void {
    this.api.setUserStatus(user.id, !user.isActive).subscribe({
      next: () => this.load$.next(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to update user status.'),
    });
  }

  // ── lookups ───────────────────────────────────────────────────────────────

  getUserById(id: string): User | undefined {
    return this.users().find((u) => u.id === id);
  }

  getActivitiesForUser(_id: string): UserActivity[] {
    return getMockActivities();
  }

  // ── private helpers ───────────────────────────────────────────────────────

  private buildParams(): UserQueryParams {
    const params: UserQueryParams = {
      page:     this.page(),
      pageSize: this.pageSize(),
    };
    const search = this.searchTerm().trim();
    if (search) params.search = search;
    const role = this.roleFilter();
    if (role) params.role = role;
    const status = this.statusFilter();
    if (status === 'Active')   params.isActive = true;
    if (status === 'Inactive') params.isActive = false;
    return params;
  }

  private toCreateRequest(value: UserFormValue) {
    return {
      firstName:       value.firstName,
      lastName:        value.lastName,
      email:           value.email,
      phone:           value.phone,
      password:        value.password,
      confirmPassword: value.confirmPassword,
      role:            value.role,
      branch:          value.branch,
      isActive:        value.status === 'Active',
    };
  }

  private toUpdateRequest(value: UserFormValue) {
    return {
      firstName: value.firstName,
      lastName:  value.lastName,
      email:     value.email,
      phone:     value.phone,
      role:      value.role,
      branch:    value.branch,
      isActive:  value.status === 'Active',
    };
  }
}