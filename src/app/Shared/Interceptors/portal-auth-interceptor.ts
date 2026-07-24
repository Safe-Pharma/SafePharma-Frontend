import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PortalAuthService } from '../../Features/CustomerPortal/Services/portal-auth.service';

// Staff (auth-interceptor.ts) and patient sessions live in separate localStorage keys and
// are never both "the active identity" for the same request. This interceptor only stamps
// the portal token on requests the staff interceptor left alone, so registration order
// doesn't matter and neither identity can accidentally shadow the other.
export const portalAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  const portalAuth = inject(PortalAuthService);
  const token = portalAuth.getToken();

  if (!token) {
    return next(req);
  }

  const authorizedReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authorizedReq);
};