import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, tap, catchError, of } from 'rxjs';
import { User, PaginationMetadata } from '../models/user.model';
import { UserActivity } from '../models/activity.model';
import { UserFormValue } from '../models/user-form.model';
import { UserQueryParams } from '../models/user-query-params.model';
import { UsersApiService } from './users-api.service';
import { getMockActivities } from './mock-activities';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(UsersApiService);

  // ── filter / pagination state (drives the query) ─────────────────────────
  readonly searchTerm  = signal('');
  readonly roleFilter  = signal<string>('');
  readonly statusFilter = signal<'All' | 'Active' | 'Inactive'>('All');
  readonly page        = signal(1);
  readonly pageSize    = signal(8);

  // ── server response state ────────────────────────────────────────────────
  readonly users    = signal<User[]>([]);
  readonly metadata = signal<PaginationMetadata>({
    currentPage: 1,
    pageSize: 8,
    totalCount: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  readonly isLoading = signal(false);
  readonly error     = signal<string | null>(null);

  // ── derived from metadata ────────────────────────────────────────────────
  readonly totalCount  = computed(() => this.metadata().totalCount);
  readonly totalPages  = computed(() => this.metadata().totalPages);
  readonly hasNext     = computed(() => this.metadata().hasNext);
  readonly hasPrev     = computed(() => this.metadata().hasPrev);
  readonly rangeStart  = computed(() => {
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
        switchMap(() => {
          const params = this.buildParams();
          return this.api.getUsers(params).pipe(
            catchError((err) => {
              this.error.set(err?.error?.message ?? 'Failed to load users.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.isLoading.set(false);
        if (result) {
          this.users.set(result.items);
          this.metadata.set(result.metadata);
        }
      });

    // Initial load
    this.load$.next();
  }

  // ── actions ──────────────────────────────────────────────────────────────

  loadUsers(): void {
    this.load$.next();
  }

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
    if (this.hasNext()) {
      this.page.update((p) => p + 1);
      this.load$.next();
    }
  }

  prevPage(): void {
    if (this.hasPrev()) {
      this.page.update((p) => p - 1);
      this.load$.next();
    }
  }

  // ── mutations (call API then reload list) ────────────────────────────────

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

  createUser(value: UserFormValue): void {
    const request = this.toCreateRequest(value);
    this.api.createUser(request).subscribe({
      next: () => this.load$.next(),
      error: (err) => this.error.set(err?.error?.errors?.join(', ') ?? 'Failed to create user.'),
    });
  }

  updateUser(id: string, value: UserFormValue): void {
    const request = this.toUpdateRequest(value);
    this.api.updateUser(id, request).subscribe({
      next: () => this.load$.next(),
      error: (err) => this.error.set(err?.error?.errors?.join(', ') ?? 'Failed to update user.'),
    });
  }

  // ── lookups ──────────────────────────────────────────────────────────────

  getUserById(id: string): User | undefined {
    return this.users().find((u) => u.id === id);
  }

  getActivitiesForUser(_id: string): UserActivity[] {
    return getMockActivities(); // swap for API call when endpoint is ready
  }

  // ── private helpers ──────────────────────────────────────────────────────

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