import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../Services/auth-session.service';

export const ownerAuthGuard: CanActivateFn = () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);
  const user = authSession.syncFromStorage();

  if (user?.role === 'Owner') {
    return true;
  }

  return router.parseUrl('/owner-login');
};
