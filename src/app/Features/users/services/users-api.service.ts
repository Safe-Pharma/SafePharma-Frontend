import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult, User } from '../models/user.model';
import { UserQueryParams } from '../models/user-query-params.model';
import { environment } from '../../../../environments/environment';

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
}

const BASE_URL = `${environment.apiUrl}`;

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);

  getUsers(query: UserQueryParams): Observable<PagedResult<User>> {
    let params = new HttpParams();

    if (query.search)                 params = params.set('search',         query.search);
    if (query.role)                   params = params.set('role',           query.role);
    if (query.isActive !== undefined) params = params.set('isActive',       String(query.isActive));
    if (query.page)                   params = params.set('page',           String(query.page));
    if (query.pageSize)               params = params.set('pageSize',       String(query.pageSize));
    if (query.sortBy)                 params = params.set('sortBy',         query.sortBy);
    if (query.sortDescending)         params = params.set('sortDescending', String(query.sortDescending));

    return this.http.get<PagedResult<User>>(`${BASE_URL}/users`, { params });
  }

  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${BASE_URL}/users/roles`);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${BASE_URL}/users/${id}`);
  }

  createUser(request: unknown): Observable<User> {
    return this.http.post<User>(`${BASE_URL}/users`, request);
  }

  updateUser(id: string, request: unknown): Observable<User> {
    return this.http.put<User>(`${BASE_URL}/users/${id}`, request);
  }

  setUserStatus(id: string, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${BASE_URL}/users/${id}/status`, { isActive });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/users/${id}`);
  }
}