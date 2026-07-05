import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
     private baseUrl = 'https://localhost:7259/api/Authentication';
    constructor(private http: HttpClient, private authSession: AuthSessionService) {}
      login(data: any) {
         return this.http.post(`${this.baseUrl}/login`, data);
         }
     changePassword(data: any) {
          const token = this.authSession.getToken();
                        const headers = token
                            ? new HttpHeaders({ Authorization: `Bearer ${token}` })
                            : undefined;

                        return this.http.post(
                            `${this.baseUrl}/change-password`,
                            {
                                currentPassword: data.currentPassword,
                                newPassword: data.newPassword,
                            },
                            { headers }
                        );
        }
    }
